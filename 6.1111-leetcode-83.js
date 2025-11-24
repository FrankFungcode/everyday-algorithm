/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 22:58:25
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-24 23:10:00
 * @FilePath: \everyday-algorithm\6.1111-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 83. 删除排序链表中的重复元素
 * https://leetcode.cn/problems/remove-duplicates-from-sorted-list/
   给定一个已排序的链表的头 head ， 删除所有重复的元素，使每个元素只出现一次 。返回 已排序的链表 。
   
   示例 1：
   输入：head = [1,1,2]
   输出：[1,2]
   
   示例 2：
   输入：head = [1,1,2,3,3]
   输出：[1,2,3]
   
   提示：
   链表中节点数目在范围 [0, 300] 内
   -100 <= Node.val <= 100
   题目数据保证链表已经按升序 排列
 */

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var deleteDuplicates = function (head) {
  // 边界情况：空链表
  if (!head) return head;

  // 使用一个指针遍历链表
  let current = head;

  while (current && current.next) {
    // 如果当前节点值等于下一个节点值
    if (current.val === current.next.val) {
      // 跳过下一个节点（删除重复节点）
      current.next = current.next.next;
    } else {
      // 值不同，移动到下一个节点
      current = current.next;
    }
  }

  return head;
};
/**
 * 复杂度分析
时间复杂度: O(n)，n 为链表长度，只需遍历一次
空间复杂度: O(1)，只使用了常数额外空间
 */
