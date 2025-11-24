
/**
 * leetcode 2. 两数相加 https://leetcode.cn/problems/add-two-numbers/


    给你两个 非空 的链表，表示两个非负的整数。它们每位数字都是按照 逆序 的方式存储的，并且每个节点只能存储 一位 数字。
    
    请你将两个数相加，并以相同形式返回一个表示和的链表。
    
    你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

    示例 1：
    输入：l1 = [2,4,3], l2 = [5,6,4]
    输出：[7,0,8]
    解释：342 + 465 = 807.
    示例 2：
    
    输入：l1 = [0], l2 = [0]
    输出：[0]
    示例 3：
    
    输入：l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
    输出：[8,9,9,9,0,0,0,1]
 */

/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
var addTwoNumbers = function(l1, l2) {
    const dummy = new ListNode(0); // 哨兵节点
    let current = dummy;
    let carry = 0; // 进位
    
    // 只要还有节点或还有进位，就继续
    while (l1 || l2 || carry) {
        // 获取当前位的值，如果节点不存在则为0
        const val1 = l1 ? l1.val : 0;
        const val2 = l2 ? l2.val : 0;
        
        // 计算当前位的和
        const sum = val1 + val2 + carry;
        carry = Math.floor(sum / 10); // 更新进位
        
        // 创建新节点存储当前位的结果
        current.next = new ListNode(sum % 10);
        current = current.next;
        
        // 移动到下一个节点
        if (l1) l1 = l1.next;
        if (l2) l2 = l2.next;
    }
    
    return dummy.next;
};
/**
 * 复杂度分析
时间复杂度：O(max(m, n))，m 和 n 分别是两个链表的长度
空间复杂度：O(max(m, n))，结果链表的长度最多为较长链表长度 + 1
 */