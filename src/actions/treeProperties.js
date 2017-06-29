/*eslint max-len: 0*/
import { calcVisibility,
   calcTipRadii,
   calcTipCounts,
   identifyPathToTip,
   calcBranchThickness } from "../util/treeHelpers";
import { determineColorByGenotypeType } from "../util/urlHelpers";
import { changeColorBy } from "./colors";
import * as types from "./types";
import { defaultColorBy } from "../util/globals";

/**
 * define the visible branches and their thicknesses. This could be a path to a single tip or a selected clade.
 * filtering etc will "turn off" branches, etc etc
 * for arg destructuring see https://simonsmith.io/destructuring-objects-as-function-parameters-in-es6/
 * @param  {int} idxOfInViewRootNode If clade selected then start visibility at this index. (root = 0)
 * @param  {int} tipSelectedIdx idx of the selected tip. If not 0 will highlight path to this tip.
 * @return {null} side effects: a single action
 */
export const updateVisibleTipsAndBranchThicknesses = function (
  {idxOfInViewRootNode = 0, tipSelectedIdx = 0} = {}) {
  /* this fn doesn't need arguments as it relies on the "inView" attr of nodes */
  return (dispatch, getState) => {
    const { tree, controls } = getState();
    if (!tree.nodes) {return;}
    const visibility = tipSelectedIdx ? identifyPathToTip(tree.nodes, tipSelectedIdx) : calcVisibility(tree, controls);
    /* recalculate tipCounts over the tree - modifies redux tree nodes in place (yeah, I know) */
    calcTipCounts(tree.nodes[0], visibility);
    /* re-calculate branchThickness (inline)*/
    dispatch({
      type: types.UPDATE_VISIBILITY_AND_BRANCH_THICKNESS,
      visibility: visibility,
      visibilityVersion: tree.visibilityVersion + 1,
      branchThickness: calcBranchThickness(tree.nodes, visibility, idxOfInViewRootNode),
      branchThicknessVersion: tree.branchThicknessVersion + 1
    });
  };
};


/* when tip max / min changes, we need to (a) update the controls reducer
with the new value(s), (b) update the tree visibility */
export const changeDateFilter = function (newMin, newMax) {
  return (dispatch, getState) => {
  // console.log("changeDateFilter", newMin, newMax)
    const { tree } = getState();
    if (newMin) {
      dispatch({type: types.CHANGE_DATE_MIN, data: newMin});
    }
    if (newMax) {
      dispatch({type: types.CHANGE_DATE_MAX, data: newMax});
    }
    /* initially, the tree isn't loaded, so don't bother trying to do things */
    if (tree.loaded) {
      dispatch(updateVisibleTipsAndBranchThicknesses());
    }
  };
};

export const changeAnalysisSliderValue = function (value) {
  return (dispatch, getState) => {
    const { tree } = getState();
    dispatch({type: types.CHANGE_ANALYSIS_VALUE, value});
    /* initially, the tree isn't loaded, so don't bother trying to do things */
    if (tree.loaded) {
      dispatch(updateVisibleTipsAndBranchThicknesses());
    }
  };
};

/* zoomToClade takes care of setting tipVis and branchThickness.
Note that the zooming / tree stuff is done imperitively by phyloTree */
export const zoomToClade = function (idxOfInViewRootNode) {
  return (dispatch) => {
    dispatch(updateVisibleTipsAndBranchThicknesses({idxOfInViewRootNode}));
  };
};

const updateTipRadii = () => {
  return (dispatch, getState) => {
    const { controls, sequences, tree } = getState();
    dispatch({
      type: types.UPDATE_TIP_RADII,
      data: calcTipRadii(controls.selectedLegendItem, controls.colorScale, sequences, tree),
      version: tree.tipRadiiVersion + 1
    });
  };
};

/* when the selected legend item changes
(a) update the controls reducer with the new value
(b)change the tipRadii
*/
export const legendMouseEnterExit = function (label = null) {
  return (dispatch) => {
    if (label) {
      dispatch({type: types.LEGEND_ITEM_MOUSEENTER,
                data: label});
    } else {
      dispatch({type: types.LEGEND_ITEM_MOUSELEAVE});
    }
    dispatch(updateTipRadii());
  };
};

export const applyFilterQuery = (filterType, fields, values) => {
  /* filterType: e.g. authers || geographic location
  fields: e.g. region || country || authors
  values: list of selected values, e.g [brazil, usa, ...]
  */
  return (dispatch) => {
    dispatch({type: types.APPLY_FILTER_QUERY,
              // filterType,
              fields,
              values});
    dispatch(updateVisibleTipsAndBranchThicknesses());
  };
};

export const changeMutType = (data) => {
  return (dispatch, getState) => {
    const { controls } = getState();
    const g = determineColorByGenotypeType(controls.colorBy);
    if (g && g !== data) {
      dispatch(changeColorBy(defaultColorBy));
    }
    dispatch({type: types.TOGGLE_MUT_TYPE, data});
  };
};

export const toggleTemporalConfidence = () => ({
  type: types.TOGGLE_TEMPORAL_CONF
});
