/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-07 15:14:48
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-17 17:54:28
 * @FilePath: \每日作业\4.1107-反转链表.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 206. 反转链表 https://leetcode.cn/problems/reverse-linked-list/
 * 给你单链表的头节点 head ，请你反转链表，并返回反转后的链表。
 * 输入：head = [1,2,3,4,5] 输出：[5,4,3,2,1]
 * 输入：head = [1,2]       输出：[2,1]
 * 输入：head = []          输出：[]
 * 提示：
 * 链表中节点的数目范围是 [0, 5000]
 * -5000 <= Node.val <= 5000 进阶：链表可以选用迭代或递归方式完成反转。你能否用两种方法解决这道题？
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
var reverseList = function (head) {
  if (!head || !head.next) {
    return head;
  }
  let last = null;
  let current = head;
  while (current) {
    let next = current.next;
    current.next = last;
    last = current;
    current = next;
  }
  return last;
};

/**
 * 237. 删除链表中的节点 https://leetcode.cn/problems/delete-node-in-a-linked-list/
 * 
 * 
  有一个单链表的 head，我们想删除它其中的一个节点 node。
  
  给你一个需要删除的节点 node 。你将 无法访问 第一个节点  head。
  
  链表的所有值都是 唯一的，并且保证给定的节点 node 不是链表中的最后一个节点。
  
  删除给定的节点。注意，删除节点并不是指从内存中删除它。这里的意思是：
  
  给定节点的值不应该存在于链表中。
  链表中的节点数应该减少 1。
  node 前面的所有值顺序相同。
  node 后面的所有值顺序相同。
  自定义测试：
  
  对于输入，你应该提供整个链表 head 和要给出的节点 node。node 不应该是链表的最后一个节点，而应该是链表中的一个实际节点。
  我们将构建链表，并将节点传递给你的函数。
  输出将是调用你函数后的整个链表。

  输入：head = [4,5,1,9], node = 5
  输出：[4,1,9]
  解释：指定链表中值为 5 的第二个节点，那么在调用了你的函数之后，该链表应变为 4 -> 1 -> 9

  输入：head = [4,5,1,9], node = 1
  输出：[4,5,9]
  解释：指定链表中值为 1 的第三个节点，那么在调用了你的函数之后，该链表应变为 4 -> 5 -> 9
 *
 */

/**
 * Definition for singly-linked list.
 * function ListNode(val) {
 *     this.val = val;
 *     this.next = null;
 * }
 */
/**
 * @param {ListNode} node
 * @return {void} Do not return anything, modify node in-place instead.
 */
var deleteNode = function (node) {
  if (!node) return;
  if (!node.next) {
    node = null;
    return;
  }
  node.val = node.next.val;
  node.next = node.next.next;
};
