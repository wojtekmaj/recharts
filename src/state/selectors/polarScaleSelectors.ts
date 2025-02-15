import { createSelector } from '@reduxjs/toolkit';
import { RechartsRootState } from '../store';
import { AxisId } from '../cartesianAxisSlice';
import { RechartsScale } from '../../util/ChartUtils';
import {
  combineAxisTicks,
  combineScaleFunction,
  pickAxisType,
  selectAxisDomain,
  selectCategoricalDomain,
  selectDuplicateDomain,
  selectRealScaleType,
} from './axisSelectors';
import {
  selectAngleAxis,
  selectAngleAxisRangeWithReversed,
  selectRadiusAxis,
  selectRadiusAxisRangeWithReversed,
} from './polarAxisSelectors';
import { CartesianTickItem } from '../../util/types';
import { selectChartLayout } from '../../context/chartLayoutContext';

const selectPolarAxis = (state: RechartsRootState, axisType: 'angleAxis' | 'radiusAxis', axisId: AxisId) => {
  switch (axisType) {
    case 'angleAxis': {
      return selectAngleAxis(state, axisId);
    }
    case 'radiusAxis': {
      return selectRadiusAxis(state, axisId);
    }
    default: {
      throw new Error(`Unexpected axis type: ${axisType}`);
    }
  }
};

const selectPolarAxisRange = (state: RechartsRootState, axisType: 'angleAxis' | 'radiusAxis', axisId: AxisId) => {
  switch (axisType) {
    case 'angleAxis': {
      return selectAngleAxisRangeWithReversed(state, axisId);
    }
    case 'radiusAxis': {
      return selectRadiusAxisRangeWithReversed(state, axisId);
    }
    default: {
      throw new Error(`Unexpected axis type: ${axisType}`);
    }
  }
};

export const selectPolarAxisScale: (
  state: RechartsRootState,
  axisType: 'angleAxis' | 'radiusAxis',
  polarAxisId: AxisId,
) => RechartsScale | undefined = createSelector(
  [selectPolarAxis, selectRealScaleType, selectAxisDomain, selectPolarAxisRange],
  combineScaleFunction,
);

const polarAxisNeverHasNiceTicks = (): undefined => undefined;

export const selectPolarAxisTicks: (
  state: RechartsRootState,
  axisType: 'angleAxis' | 'radiusAxis',
  polarAxisId: AxisId,
) => ReadonlyArray<CartesianTickItem> | undefined = createSelector(
  [
    selectChartLayout,
    selectPolarAxis,
    selectRealScaleType,
    selectPolarAxisScale,
    polarAxisNeverHasNiceTicks,
    selectPolarAxisRange,
    selectDuplicateDomain,
    selectCategoricalDomain,
    pickAxisType,
  ],
  combineAxisTicks,
);
