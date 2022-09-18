/**
 * 向上查找 UiObject 的父节点，找到可点击的祖先节点
 * @param {UiObject} node 节点
 * @returns
 */
function findClickableParent (node) {
	return !node || node.clickable() ? node : findClickableParent(node.parent());
}
module.exports = findClickableParent;
