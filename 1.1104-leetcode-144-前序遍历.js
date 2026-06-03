/**
 * 利用栈进行二叉树前序遍历[leetcode题号144]
 * https://leetcode.cn/problems/binary-tree-preorder-traversal/description/
 * 
 * 给你二叉树的根节点 root ，返回它节点值的 前序 遍历。

示例 1：

输入：root = [1,null,2,3]

输出：[1,2,3]

解释：



示例 2：

输入：root = [1,2,3,4,5,null,8,null,null,6,7,9]

输出：[1,2,4,5,6,7,3,8,9]

解释：



示例 3：

输入：root = []

输出：[]

示例 4：

输入：root = [1]

输出：[1]

 

提示：

树中节点数目在范围 [0, 100] 内
-100 <= Node.val <= 100
 

进阶：递归算法很简单，你可以通过迭代算法完成吗？
 * 
 * 
 */

// 解题

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
var preorderTraversal = function (root) {
    //根节点->左子树->右子树
  const result = [];
  const stack = [];
  // 将根节点存入栈中
  if (root) {
    stack.push(root);
  }
  // 开始遍历二叉树
  while (stack.length) {
    const node = stack.pop();
    result.push(node.val);
    if (node.right) {
      stack.push(node.right);
    }
    if (node.left) {
      stack.push(node.left);
    }
  }
  return result;
};
