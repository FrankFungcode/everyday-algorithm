/**
 * leetcode 133. Clone Graph 克隆图
 * https://leetcode.cn/problems/clone-graph/
 * 给你无向 连通 图中一个节点的引用，请你返回该图的 深拷贝（克隆）。
 * 图中的每个节点都包含它的值 val（int） 和其邻居的列表（list[Node]）。
 *
 * class Node {
 *     public int val;
 *     public List<Node> neighbors;
 * }
 * 
 * 测试用例格式：
 * 
 * 简单起见，每个节点的值都和它的索引相同。例如，第一个节点值为 1（val = 1），第二个节点值为 2（val = 2），以此类推。该图在测试用例中使用邻接列表表示。
 *
 * 邻接列表 是用于表示有限图的无序列表的集合。每个列表都描述了图中节点的邻居集。
 *
 * 给定节点将始终是图中的第一个节点（值为 1）。你必须将 给定节点的拷贝 作为对克隆图的引用返回。
 * 
 * 示例 1：
 * 如下指示：
 * 1 > 2
 * v   v
 * 4 > 3
 * 
 * 输入：adjList = [[2,4],[1,3],[2,4],[1,3]]
 * 输出：[[2,4],[1,3],[2,4],[1,3]]
 * 解释：
 * 图中有 4 个节点。
 * 节点 1 的值是 1，它有两个邻居：节点 2 和 4 。
 * 节点 2 的值是 2，它有两个邻居：节点 1 和 3 。
 * 节点 3 的值是 3，它有两个邻居：节点 2 和 4 。
 * 节点 4 的值是 4，它有两个邻居：节点 1 和 3 。
 * 
 * 示例 2：
 * 输入：adjList = [[]]
 * 输出：[[]]
 * 解释：输入包含一个空列表。该图仅仅只有一个值为 1 的节点，它没有任何邻居。
 * 示例 3：
 * 
 * 输入：adjList = []
 * 输出：[]
 * 解释：这个图是空的，它不含任何节点。
 * 
 * 提示：
 * 这张图中的节点数在 [0, 100] 之间。
 * 1 <= Node.val <= 100
 * 每个节点值 Node.val 都是唯一的，
 * 图中没有重复的边，也没有自环。
 * 图是连通图，你可以从给定节点访问到所有节点。
 * 
 */

/**
 * // Definition for a _Node.
 * function _Node(val, neighbors) {
 *    this.val = val === undefined ? 0 : val;
 *    this.neighbors = neighbors === undefined ? [] : neighbors;
 * };
 */

/**
 * 深拷贝无向连通图（DFS + 哈希表）
 *
 * 思路：
 * 1. 图可能有环，必须用 Map 记录「原节点 -> 克隆节点」，防止无限递归和重复创建
 * 2. 对每个节点：先新建克隆并立刻登记到 Map，再递归处理邻居
 * 3. 遇到已克隆过的节点（回边），直接从 Map 取出克隆节点挂到 neighbors
 *
 * 时间复杂度 O(N + E)，空间复杂度 O(N)
 *
 * @param {_Node} node 图中任意一个节点的引用（题目保证为连通图的入口）
 * @return {_Node} 克隆图中对应节点的引用
 */
var cloneGraph = function(node) {
    // 空图：无节点可克隆
    if (!node) return null;

    // visited：原节点 -> 已创建的克隆节点
    const visited = new Map();

    /**
     * 深度优先克隆当前节点及其可达子图
     * @param {_Node} curr 原图中的当前节点
     * @return {_Node} 对应的克隆节点
     */
    const dfs = (curr) => {
        // 已克隆过：说明是回边或重复访问，直接复用，避免成环死循环
        if (visited.has(curr)) {
            return visited.get(curr);
        }

        // 只拷贝 val，neighbors 先留空；必须先登记再填邻居，否则处理环时找不到自身
        const clone = new _Node(curr.val);
        visited.set(curr, clone);

        // 递归克隆每个邻居，并把克隆后的邻居挂到当前克隆节点上
        for (const neighbor of curr.neighbors) {
            clone.neighbors.push(dfs(neighbor));
        }
        return clone;
    };

    // 从给定入口节点开始，克隆整张连通图
    return dfs(node);
};

/**
 * 深拷贝无向连通图（BFS + 哈希表）
 *
 * 思路：
 * 1. 同样用 Map 记录「原节点 -> 克隆节点」
 * 2. 队列驱动：先克隆起点入队，再逐层处理邻居
 * 3. 邻居尚未克隆则新建、登记并入队；已克隆则直接从 Map 取出来挂边
 *
 * 时间复杂度 O(N + E)，空间复杂度 O(N)
 *
 * @param {_Node} node 图中任意一个节点的引用
 * @return {_Node} 克隆图中对应节点的引用
 */
var cloneGraphBfs = function(node) {
    // 空图：无节点可克隆
    if (!node) return null;

    // visited：原节点 -> 已创建的克隆节点
    const visited = new Map();

    // 先克隆起点并登记，作为 BFS 入口
    const cloneStart = new _Node(node.val);
    visited.set(node, cloneStart);

    // 队列中存放原图节点，用来按层扩展
    const queue = [node];

    while (queue.length > 0) {
        const curr = queue.shift();
        const cloneCurr = visited.get(curr);

        // 遍历当前节点的所有邻居，补齐克隆节点的 neighbors
        for (const neighbor of curr.neighbors) {
            if (!visited.has(neighbor)) {
                // 邻居尚未克隆：新建、登记，并入队稍后处理其邻居
                const cloneNeighbor = new _Node(neighbor.val);
                visited.set(neighbor, cloneNeighbor);
                queue.push(neighbor);
            }
            // 无论新建还是已有，都把对应克隆邻居挂到当前克隆节点上
            cloneCurr.neighbors.push(visited.get(neighbor));
        }
    }

    // 返回起点对应的克隆节点
    return cloneStart;
};

