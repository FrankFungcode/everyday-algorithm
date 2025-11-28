/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-27 11:04:31
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-28 09:57:24
 * @FilePath: \everyday-algorithm\16.1125-leetcode-102.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 94. 二叉树的中序遍历
 * https://leetcode.cn/problems/binary-tree-inorder-traversal/
 * 给定一个二叉树的根节点 root ，返回 它的 中序 遍历 。
   示例 1：
   输入：root = [1,null,2,3]
   输出：[1,3,2]
   
   示例 2：
   输入：root = []
   输出：[]
   
   示例 3：
   输入：root = [1]
   输出：[1]
   
   提示：
   树中节点数目在范围 [0, 100] 内
   -100 <= Node.val <= 100
 */
/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
var inorderTraversal = function (root) {
  const result = [];
  const stack = [];
  let current = root;

  while (current !== null || stack.length > 0) {
    // 1. 一直向左走到底， 将所有左节点入栈中
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    // 2. 弹出栈顶节点（此时已经没有左子节点）
    current = stack.pop();

    // 3. 访问改节点
    result.push(current.val);

    // 4. 转向右子树
    current = current.right;
  }
  return result;
};

/**
 * 复杂度分析
时间复杂度：O(n)
空间复杂度：O(h) h为树的高度，最坏情况下（斜树）为O(n)
 */
