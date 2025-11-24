/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 22:58:25
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-24 23:33:09
 * @FilePath: \everyday-algorithm\6.1111-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 141. 环形链表
 * https://leetcode.cn/problems/linked-list-cycle/
   给你一个链表的头节点 head ，判断链表中是否有环。
   
   如果链表中有某个节点，可以通过连续跟踪 next 指针再次到达，则链表中存在环。 
   为了表示给定链表中的环，评测系统内部使用整数 pos 来表示链表尾连接到链表中的位置（索引从 0 开始）。
   注意：pos 不作为参数进行传递 。仅仅是为了标识链表的实际情况。
   如果链表中存在环 ，则返回 true 。 否则，返回 false 。
   
   示例 1：
   输入：head = [3,2,0,-4], pos = 1
   输出：true
   解释：链表中有一个环，其尾部连接到第二个节点。

   示例 2：
   输入：head = [1,2], pos = 0
   输出：true
   解释：链表中有一个环，其尾部连接到第一个节点。

   示例 3：
   输入：head = [1], pos = -1
   输出：false
   解释：链表中没有环。
   
   提示：
   链表中节点的数目范围是 [0, 104]
   -105 <= Node.val <= 105
   pos 为 -1 或者链表中的一个 有效索引 。
   
   进阶：你能用 O(1)（即，常量）内存解决此问题吗？
 */

var hasCycle = function (head) {
  // 边界条件：空链表或只有一个节点
  if (head === null || head.next === null) {
    return false;
  }

  // 初始化快慢指针
  let slow = head;
  let fast = head;

  // 快指针每次走两步，慢指针每次走一步
  while (fast !== null && fast.next !== null) {
    slow = slow.next; // 慢指针走一步
    fast = fast.next.next; // 快指针走两步

    // 如果快慢指针相遇，说明有环
    if (slow === fast) {
      return true;
    }
  }

  // 快指针到达链表末尾，说明无环
  return false;
};

/**
 * 复杂度分析
时间复杂度：O(n)
空间复杂度：O(1)
 */
