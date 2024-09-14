/* eslint-disable max-classes-per-file */
import React, { PureComponent, ReactElement } from 'react';
import Animate from 'react-smooth';
import { isEqual, isFunction, isString, omit } from 'es-toolkit/compat';

import clsx from 'clsx';
import { selectActiveIndex } from '../state/selectors/selectors';
import { useAppSelector } from '../state/hooks';
import { Layer } from '../container/Layer';
import { Props as TrapezoidProps } from '../shape/Trapezoid';
import { LabelList } from '../component/LabelList';
import { Cell, Props as CellProps } from '../component/Cell';
import { findAllByType, filterProps } from '../util/ReactUtils';
import { Global } from '../util/Global';
import { interpolateNumber } from '../util/DataUtils';
import { getValueByDataKey } from '../util/ChartUtils';
import {
  LegendType,
  TooltipType,
  AnimationTiming,
  ChartOffset,
  DataKey,
  adaptEventsOfChild,
  PresentationAttributesAdaptChildEvent,
  AnimationDuration,
  ActiveShape,
} from '../util/types';
import { FunnelTrapezoid, FunnelTrapezoidProps } from '../util/FunnelUtils';
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from '../context/tooltipContext';
import { TooltipPayloadConfiguration } from '../state/tooltipSlice';
import { SetTooltipEntrySettings } from '../state/SetTooltipEntrySettings';
import { UpdateId, useOffset, useUpdateId } from '../context/chartLayoutContext';

export interface FunnelTrapezoidItem extends TrapezoidProps {
  value?: number | string;
  payload?: any;
  isActive: boolean;
}

/**
 * Internal props, combination of external props + defaultProps + private Recharts state
 */
interface InternalFunnelProps {
  animationId?: UpdateId;
  trapezoids?: FunnelTrapezoidItem[];
  className?: string;
  dataKey: DataKey<any>;
  nameKey?: DataKey<any>;
  data?: any[];
  hide?: boolean;
  shape?: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  activeShape?: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  lastShapeType?: 'triangle' | 'rectangle';
  reversed?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: AnimationTiming;
  id?: string;
}

/**
 * External props, intended for end users to fill in
 */
interface FunnelProps {
  className?: string;
  dataKey: DataKey<any>;
  nameKey?: DataKey<any>;
  data?: any[];
  hide?: boolean;
  shape?: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  activeShape?: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  lastShapeType?: 'triangle' | 'rectangle';
  reversed?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: AnimationTiming;
  id?: string;
}

type FunnelSvgProps = PresentationAttributesAdaptChildEvent<any, SVGElement> & TrapezoidProps;

export type Props = FunnelSvgProps & FunnelProps & InternalFunnelProps;

interface State {
  readonly prevTrapezoids?: FunnelTrapezoidItem[];
  readonly curTrapezoids?: FunnelTrapezoidItem[];
  readonly prevAnimationId?: UpdateId;
  readonly isAnimationFinished?: boolean;
}

type RealFunnelData = any;

type FunnelComposedData = {
  trapezoids: FunnelTrapezoidItem[];
  data: RealFunnelData[];
};

type FunnelTrapezoidsProps = {
  trapezoids: FunnelTrapezoidItem[];
  shape: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  activeShape: ActiveShape<FunnelTrapezoidItem, SVGPathElement>;
  allOtherFunnelProps: Props;
};

function getTooltipEntrySettings(props: Props): TooltipPayloadConfiguration {
  const { dataKey, nameKey, trapezoids, stroke, strokeWidth, fill, name, hide, tooltipType } = props;
  return {
    dataDefinedOnItem: trapezoids,
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      name,
      nameKey,
      hide,
      type: tooltipType,
      color: fill,
      unit: '', // Funnel does not have unit, why?
    },
  };
}

function FunnelTrapezoids(props: FunnelTrapezoidsProps) {
  const { trapezoids, shape, activeShape, allOtherFunnelProps } = props;
  const activeItemIndex = useAppSelector(state =>
    selectActiveIndex(state, 'item', state.tooltip.settings.trigger, undefined),
  );
  const {
    onMouseEnter: onMouseEnterFromProps,
    onClick: onItemClickFromProps,
    onMouseLeave: onMouseLeaveFromProps,
    ...restOfAllOtherProps
  } = allOtherFunnelProps;

  const onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, allOtherFunnelProps.dataKey);
  const onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  const onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, allOtherFunnelProps.dataKey);

  return trapezoids.map((entry, i) => {
    const isActiveIndex = activeShape && activeItemIndex === String(i);
    const trapezoidOptions = isActiveIndex ? activeShape : shape;
    const trapezoidProps: FunnelTrapezoidProps = {
      ...entry,
      option: trapezoidOptions,
      isActive: isActiveIndex,
      stroke: entry.stroke,
    };

    return (
      <Layer
        className="recharts-funnel-trapezoid"
        {...adaptEventsOfChild(restOfAllOtherProps, entry, i)}
        // @ts-expect-error the types need a bit of attention
        onMouseEnter={onMouseEnterFromContext(entry, i)}
        // @ts-expect-error the types need a bit of attention
        onMouseLeave={onMouseLeaveFromContext(entry, i)}
        // @ts-expect-error the types need a bit of attention
        onClick={onClickFromContext(entry, i)}
        key={`trapezoid-${entry?.x}-${entry?.y}-${entry?.name}-${entry?.value}`}
        role="img"
      >
        <FunnelTrapezoid {...trapezoidProps} />
      </Layer>
    );
  });
}

const getRealWidthHeight = ({ customWidth }: { customWidth: number | string }, offset: ChartOffset) => {
  const { width, height, left, right, top, bottom } = offset;
  const realHeight = height;
  let realWidth = width;

  if (typeof (customWidth) === 'number') {
    realWidth = customWidth;
  } else if (isString(customWidth)) {
    realWidth = (realWidth * parseFloat(customWidth)) / 100;
  }

  return {
    realWidth: realWidth - left - right - 50,
    realHeight: realHeight - bottom - top,
    offsetX: (width - realWidth) / 2,
    offsetY: (height - realHeight) / 2,
  };
};

const getRealFunnelData = (item: Funnel): RealFunnelData[] => {
  const { data, children } = item.props;
  const presentationProps = filterProps(item.props, false);
  const cells = findAllByType(children, Cell);

  if (data && data.length) {
    return data.map((entry: any, index: number) => ({
      payload: entry,
      ...presentationProps,
      ...entry,
      ...(cells && cells[index] && cells[index].props),
    }));
  }

  if (cells && cells.length) {
    return cells.map((cell: ReactElement<CellProps>) => ({ ...presentationProps, ...cell.props }));
  }

  return [];
};

export class FunnelWithState extends PureComponent<Props, State> {
  state: State = { isAnimationFinished: false };

  static getDerivedStateFromProps(nextProps: Props, prevState: State): State {
    if (nextProps.animationId !== prevState.prevAnimationId) {
      return {
        prevAnimationId: nextProps.animationId,
        curTrapezoids: nextProps.trapezoids,
        prevTrapezoids: prevState.curTrapezoids,
      };
    }
    if (nextProps.trapezoids !== prevState.curTrapezoids) {
      return {
        curTrapezoids: nextProps.trapezoids,
      };
    }

    return null;
  }

  handleAnimationEnd = () => {
    const { onAnimationEnd } = this.props;
    this.setState({ isAnimationFinished: true });

    if (isFunction(onAnimationEnd)) {
      onAnimationEnd();
    }
  };

  handleAnimationStart = () => {
    const { onAnimationStart } = this.props;
    this.setState({ isAnimationFinished: false });

    if (isFunction(onAnimationStart)) {
      onAnimationStart();
    }
  };

  renderTrapezoidsStatically(trapezoids: FunnelTrapezoidItem[]) {
    const { shape, activeShape } = this.props;

    return (
      <FunnelTrapezoids
        trapezoids={trapezoids}
        shape={shape}
        activeShape={activeShape}
        allOtherFunnelProps={this.props}
      />
    );
  }

  renderTrapezoidsWithAnimation() {
    const { trapezoids, isAnimationActive, animationBegin, animationDuration, animationEasing, animationId } =
      this.props;
    const { prevTrapezoids } = this.state;

    return (
      <Animate
        begin={animationBegin}
        duration={animationDuration}
        isActive={isAnimationActive}
        easing={animationEasing}
        from={{ t: 0 }}
        to={{ t: 1 }}
        key={`funnel-${animationId}`}
        onAnimationStart={this.handleAnimationStart}
        onAnimationEnd={this.handleAnimationEnd}
      >
        {({ t }: { t: number }) => {
          const stepData = trapezoids.map((entry: any, index: number) => {
            const prev = prevTrapezoids && prevTrapezoids[index];

            if (prev) {
              const interpolatorX = interpolateNumber(prev.x, entry.x);
              const interpolatorY = interpolateNumber(prev.y, entry.y);
              const interpolatorUpperWidth = interpolateNumber(prev.upperWidth, entry.upperWidth);
              const interpolatorLowerWidth = interpolateNumber(prev.lowerWidth, entry.lowerWidth);
              const interpolatorHeight = interpolateNumber(prev.height, entry.height);

              return {
                ...entry,
                x: interpolatorX(t),
                y: interpolatorY(t),
                upperWidth: interpolatorUpperWidth(t),
                lowerWidth: interpolatorLowerWidth(t),
                height: interpolatorHeight(t),
              };
            }

            const interpolatorX = interpolateNumber(entry.x + entry.upperWidth / 2, entry.x);
            const interpolatorY = interpolateNumber(entry.y + entry.height / 2, entry.y);
            const interpolatorUpperWidth = interpolateNumber(0, entry.upperWidth);
            const interpolatorLowerWidth = interpolateNumber(0, entry.lowerWidth);
            const interpolatorHeight = interpolateNumber(0, entry.height);

            return {
              ...entry,
              x: interpolatorX(t),
              y: interpolatorY(t),
              upperWidth: interpolatorUpperWidth(t),
              lowerWidth: interpolatorLowerWidth(t),
              height: interpolatorHeight(t),
            };
          });
          return <Layer>{this.renderTrapezoidsStatically(stepData)}</Layer>;
        }}
      </Animate>
    );
  }

  renderTrapezoids() {
    const { trapezoids, isAnimationActive } = this.props;
    const { prevTrapezoids } = this.state;

    if (
      isAnimationActive &&
      trapezoids &&
      trapezoids.length &&
      (!prevTrapezoids || !isEqual(prevTrapezoids, trapezoids))
    ) {
      return this.renderTrapezoidsWithAnimation();
    }
    return this.renderTrapezoidsStatically(trapezoids);
  }

  render() {
    const { trapezoids, className, isAnimationActive } = this.props;
    const { isAnimationFinished } = this.state;

    const layerClass = clsx('recharts-trapezoids', className);

    return (
      <Layer className={layerClass}>
        {this.renderTrapezoids()}
        {(!isAnimationActive || isAnimationFinished) && LabelList.renderCallByParent(this.props, trapezoids)}
      </Layer>
    );
  }
}

const defaultFunnelProps: Partial<Props> = {
  stroke: '#fff',
  fill: '#808080',
  legendType: 'rect',
  hide: false,
  isAnimationActive: !Global.isSsr,
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: 'ease',
  nameKey: 'name',
  lastShapeType: 'triangle',
};

function FunnelImpl(props: Props) {
  const { height, width } = useOffset();

  const updateId = useUpdateId();

  const {
    ref,
    stroke = defaultFunnelProps.stroke,
    fill = defaultFunnelProps.fill,
    legendType = defaultFunnelProps.legendType,
    hide = defaultFunnelProps.hide,

    isAnimationActive = defaultFunnelProps.isAnimationActive,
    animationBegin = defaultFunnelProps.animationBegin,
    animationDuration = defaultFunnelProps.animationDuration,
    animationEasing = defaultFunnelProps.animationEasing,
    nameKey = defaultFunnelProps.nameKey,
    lastShapeType = defaultFunnelProps.lastShapeType,
    ...everythingElse
  } = props;

  return (
    <FunnelWithState
      {...everythingElse}
      stroke={stroke}
      fill={fill}
      nameKey={nameKey}
      lastShapeType={lastShapeType}
      animationId={updateId}
      animationBegin={animationBegin}
      animationDuration={animationDuration}
      animationEasing={animationEasing}
      isAnimationActive={isAnimationActive}
      hide={hide}
      legendType={legendType}
      height={height}
      width={width}
      trapezoids={props.trapezoids}
    />
  );
}

export function computeFunnelTrapezoids({
  dataKey,
  nameKey,
  displayedData,
  tooltipType,
  lastShapeType,
  reversed,
  offset,
  customWidth,
}: {
  dataKey: Props['dataKey'];
  nameKey: Props['nameKey'];
  offset: ChartOffset;
  displayedData: RealFunnelData[];
  tooltipType?: TooltipType;
  lastShapeType?: Props['lastShapeType'];
  reversed?: boolean;
  customWidth?: number;
}): FunnelComposedData {
  const { left, top } = offset;
  const { realHeight, realWidth, offsetX, offsetY } = getRealWidthHeight({ customWidth }, offset);
  const maxValue = Math.max.apply(
    null,
    displayedData.map((entry: any) => getValueByDataKey(entry, dataKey, 0)),
  );
  const len = displayedData.length;
  const rowHeight = realHeight / len;
  const parentViewBox = { x: offset.left, y: offset.top, width: offset.width, height: offset.height };

  let trapezoids = displayedData.map((entry: any, i: number): FunnelTrapezoidItem => {
    const rawVal = getValueByDataKey(entry, dataKey, 0);
    const name = getValueByDataKey(entry, nameKey, i);
    let val = rawVal;
    let nextVal;

    if (i !== len - 1) {
      nextVal = getValueByDataKey(displayedData[i + 1], dataKey, 0);

      if (nextVal instanceof Array) {
        [nextVal] = nextVal;
      }
    } else if (rawVal instanceof Array && rawVal.length === 2) {
      [val, nextVal] = rawVal;
    } else if (lastShapeType === 'rectangle') {
      nextVal = val;
    } else {
      nextVal = 0;
    }

    // @ts-expect-error getValueByDataKey does not validate the output type
    const x = ((maxValue - val) * realWidth) / (2 * maxValue) + top + 25 + offsetX;
    const y = rowHeight * i + left + offsetY;
    // @ts-expect-error getValueByDataKey does not validate the output type
    const upperWidth = (val / maxValue) * realWidth;
    const lowerWidth = (nextVal / maxValue) * realWidth;

    const tooltipPayload = [{ name, value: val, payload: entry, dataKey, type: tooltipType }];
    const tooltipPosition = {
      x: x + upperWidth / 2,
      y: y + rowHeight / 2,
    };

    return {
      x,
      y,
      width: Math.max(upperWidth, lowerWidth),
      upperWidth,
      lowerWidth,
      height: rowHeight,
      // @ts-expect-error getValueByDataKey does not validate the output type
      name,
      val,
      tooltipPayload,
      tooltipPosition,
      ...omit(entry, 'width'),
      payload: entry,
      parentViewBox,
      labelViewBox: {
        x: x + (upperWidth - lowerWidth) / 4,
        y,
        width: Math.abs(upperWidth - lowerWidth) / 2 + Math.min(upperWidth, lowerWidth),
        height: rowHeight,
      },
    };
  });

  if (reversed) {
    trapezoids = trapezoids.map((entry: any, index: number) => {
      const newY = entry.y - index * rowHeight + (len - 1 - index) * rowHeight;
      return {
        ...entry,
        upperWidth: entry.lowerWidth,
        lowerWidth: entry.upperWidth,
        x: entry.x - (entry.lowerWidth - entry.upperWidth) / 2,
        y: entry.y - index * rowHeight + (len - 1 - index) * rowHeight,
        tooltipPosition: { ...entry.tooltipPosition, y: newY + rowHeight / 2 },
        labelViewBox: {
          ...entry.labelViewBox,
          y: newY,
        },
      };
    });
  }

  return {
    trapezoids,
    data: displayedData,
  };
}

export class Funnel extends PureComponent<Props> {
  static displayName = 'Funnel';

  static defaultProps = defaultFunnelProps;

  static getComposedData = ({ item, offset }: { item: Funnel; offset: ChartOffset }): FunnelComposedData => {
    const funnelData = getRealFunnelData(item);
    const { dataKey, nameKey, tooltipType, lastShapeType, reversed } = item.props;

    return computeFunnelTrapezoids({
      dataKey,
      nameKey,
      displayedData: funnelData,
      tooltipType,
      lastShapeType,
      reversed,
      offset,
    });
  };

  render() {
    const { hide, trapezoids } = this.props;

    if (hide || !trapezoids || !trapezoids.length) {
      return <SetTooltipEntrySettings fn={getTooltipEntrySettings} args={this.props} />;
    }

    return (
      <>
        <SetTooltipEntrySettings fn={getTooltipEntrySettings} args={this.props} />
        <FunnelImpl {...this.props} />
      </>
    );
  }
}
