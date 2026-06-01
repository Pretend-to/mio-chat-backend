#!/usr/bin/env node

/**
 * tieba-cli — 贴吧操作命令行工具
 * 封装所有常用贴吧操作，供 cron 任务和交互使用
 *
 * 用法:
 *   node tieba-cli.js check             检查回复消息
 *   node tieba-cli.js list [--hot]      浏览帖子列表（--hot 按热门排序）
 *   node tieba-cli.js like <thread_id>  点赞主帖
 *   node tieba-cli.js view <thread_id>  查看帖子详情
 *   node tieba-cli.js comment <thread_id> "内容"  评论主帖
 *   node tieba-cli.js reply <post_id> "内容"      回复楼层
 *   node tieba-cli.js heartbeat         全流程心跳
 */

const BASE = 'https://tieba.baidu.com';
const TOKEN_FILE = '/www/fake_mio/servers/mio-chat-backend/.agents/skills/tieba-claw/.token.json';

const fs = require('fs');
const http = require('http');
const https = require('https');

// ─── helpers ───────────────────────────────────────────────

function getToken() {
  const raw = fs.readFileSync(TOKEN_FILE, 'utf-8');
  return JSON.parse(raw).TB_TOKEN;
}

function get(uri) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    const url = new URL(uri, BASE);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'tieba/12.0 (Android 13; Pixel 7)',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function post(uri, body) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    const url = new URL(uri, BASE);
    const json = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
        'User-Agent': 'tieba/12.0 (Android 13; Pixel 7)',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function truncate(str, n = 120) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '...' : str;
}

// ─── commands ──────────────────────────────────────────────

async function cmdCheck() {
  const data = await get('/mo/q/claw/replyme?pn=1');
  const list = data.data?.reply_list || [];
  console.log(`共 ${list.length} 条回复消息\n`);
  let hasUnread = false;
  for (const r of list) {
    const tag = r.unread ? '🔴 未读' : '⚫ 已读';
    if (r.unread) hasUnread = true;
    console.log(`  ${tag} | ${r.title}`);
    console.log(`  内容: ${truncate(r.content, 150)}`);
    console.log(`  thread_id: ${r.thread_id} | post_id: ${r.post_id}\n`);
  }
  // 输出 JSON 给程序消费
  console.log('---META---');
  console.log(JSON.stringify({ count: list.length, hasUnread, replies: list }));
}

async function cmdList({ hot }) {
  const sort = hot ? 3 : 0;
  const data = await get(`/c/f/frs/page_claw?sort_type=${sort}&forum_id=5608073`);
  const threads = data.data?.thread_list || [];
  console.log(`获取到 ${threads.length} 个帖子（${hot ? '热门' : '时间'}排序）\n`);
  for (const t of threads) {
    const abs = t.abstract?.map(a => a.text).join(' ').replace(/\n/g, ' ') || '';
    console.log(`📌 ${t.title}`);
    console.log(`   作者: ${t.author?.name || '?'} | 回复: ${t.reply_num} | 浏览: ${t.view_num} | 赞: ${t.agree_num || 0}`);
    console.log(`   链接: https://tieba.baidu.com/p/${t.id}`);
    console.log(`   摘要: ${truncate(abs, 150)}`);
    console.log();
  }
}

async function cmdLike(threadId) {
  if (!threadId) { console.error('❌ 缺少 thread_id'); process.exit(1); }
  const res = await post('/c/c/claw/opAgree', {
    thread_id: parseInt(threadId),
    obj_type: 3,
    op_type: 0,
  });
  if (res.errno === 0) {
    console.log(`✅ 点赞成功! https://tieba.baidu.com/p/${threadId}`);
  } else {
    console.log(`❌ 点赞失败: ${JSON.stringify(res)}`);
  }
}

async function cmdView(threadId) {
  if (!threadId) { console.error('❌ 缺少 thread_id'); process.exit(1); }
  const data = await get(`/c/f/pb/page_claw?pn=1&kz=${threadId}&r=2`);
  const posts = data.post_list || [];
  console.log(`帖子详情 (共 ${posts.length} 条)\n`);
  for (const p of posts.slice(0, 10)) {
    const content = (typeof p.content === 'string') ? p.content
      : (p.content || []).map(c => c.text || '').join('');
    const author = p.author?.name || '';
    const agree = p.agree?.agree_num || p.upvotes || 0;
    console.log(`  ${author ? '👤 ' + author : '📝'} | 赞 ${agree}`);
    console.log(`  ${truncate(content, 300)}`);
    console.log();
  }
}

async function cmdComment(threadId, content) {
  if (!threadId || !content) { console.error('❌ 用法: tieba-cli comment <thread_id> "内容"'); process.exit(1); }
  const res = await post('/c/c/claw/addPost', {
    content: content,
    thread_id: parseInt(threadId),
  });
  if (res.errno === 0) {
    console.log(`✅ 评论成功! https://tieba.baidu.com/p/${res.data?.thread_id || threadId}?pid=${res.data?.post_id || ''}`);
  } else {
    console.log(`❌ 评论失败: ${JSON.stringify(res)}`);
  }
}

async function cmdReply(postId, content) {
  if (!postId || !content) { console.error('❌ 用法: tieba-cli reply <post_id> "内容"'); process.exit(1); }
  const res = await post('/c/c/claw/addPost', {
    content: content,
    post_id: parseInt(postId),
  });
  if (res.errno === 0) {
    console.log(`✅ 回复成功! post_id=${res.data?.post_id || ''}`);
  } else {
    console.log(`❌ 回复失败: ${JSON.stringify(res)}`);
  }
}

// ─── heartbeat 全流程 ──────────────────────────────────────

async function cmdHeartbeat() {
  console.log('🦐 === 贴吧心跳开始 ===');
  console.log(`[${new Date().toISOString()}]\n`);

  // 1. 检查回复
  console.log('📬 Step 1: 检查回复消息');
  const replyData = await get('/mo/q/claw/replyme?pn=1');
  const replies = replyData.data?.reply_list || [];
  const unreadReplies = replies.filter(r => r.unread);
  console.log(`  共 ${replies.length} 条回复，其中 ${unreadReplies.length} 条未读\n`);
  if (unreadReplies.length > 0) {
    console.log('  🔴 未读消息需要处理:');
    for (const r of unreadReplies) {
      console.log(`  - [${r.title}] ${truncate(r.content, 100)}`);
    }
    console.log(`  请主人确认是否需要回复\n`);
  }

  // 2. 浏览帖子列表
  console.log('🏄 Step 2: 浏览抓虾吧帖子');
  const listData = await get('/c/f/frs/page_claw?sort_type=3&forum_id=5608073');
  const threads = listData.data?.thread_list || [];
  console.log(`  热门排序，共 ${threads.length} 个帖子\n`);

  // 3. 挑好的点赞
  console.log('👍 Step 3: 点赞优质帖子');
  let liked = 0;
  for (const t of threads.slice(0, 5)) {
    if ((t.agree_num || 0) < 500 && t.reply_num > 0) {
      await sleep(2000); // 频率限制
      const res = await post('/c/c/claw/opAgree', {
        thread_id: t.id,
        obj_type: 3,
        op_type: 0,
      });
      if (res.errno === 0) {
        liked++;
        console.log(`  ✅ 点赞: ${truncate(t.title, 40)}`);
      }
    }
  }
  console.log(`  共点赞 ${liked} 个帖子\n`);

  // 4. 看看有推荐的帖子要评论
  console.log('💬 Step 4: 浏览帖子详情，准备评论');
  let commented = 0;
  for (const t of threads.slice(0, 3)) {
    if (t.reply_num > 0 && (t.agree_num || 0) > 10) {
      await sleep(2000);
      const detail = await get(`/c/f/pb/page_claw?pn=1&kz=${t.id}&r=2`);
      const posts = detail.post_list || [];
      if (posts.length > 0) {
        // 只看不评，避免刷屏
        console.log(`  👀 浏览: ${truncate(t.title, 40)} (${t.reply_num}回复)`);
      }
    }
  }
  console.log();

  // 5. 总结
  console.log('📋 Step 5: 总结');
  console.log(`  ✅ 检查回复: ${replies.length}条`);
  console.log(`  ✅ 浏览帖子: ${threads.length}个`);
  console.log(`  ✅ 点赞: ${liked}个`);
  console.log(`  ✅ 评论: ${commented}条\n`);
  console.log('🦐 === 贴吧心跳完成 ===');
}

// ─── main ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.log(`
tieba-cli — 贴吧命令行工具

用法:
  node tieba-cli.js check              检查回复消息
  node tieba-cli.js list [--hot]       浏览帖子列表
  node tieba-cli.js like <thread_id>   点赞主帖
  node tieba-cli.js view <thread_id>   查看帖子详情
  node tieba-cli.js comment <tid> "内容"  评论主帖
  node tieba-cli.js reply <pid> "内容"    回复楼层
  node tieba-cli.js heartbeat          全流程心跳
`);
    return;
  }

  try {
    switch (cmd) {
      case 'check':    await cmdCheck(); break;
      case 'list':     await cmdList({ hot: args.includes('--hot') }); break;
      case 'like':     await cmdLike(args[1]); break;
      case 'view':     await cmdView(args[1]); break;
      case 'comment':  await cmdComment(args[1], args.slice(2).join(' ')); break;
      case 'reply':    await cmdReply(args[1], args.slice(2).join(' ')); break;
      case 'heartbeat': await cmdHeartbeat(); break;
      default:
        console.error(`❌ 未知命令: ${cmd}`);
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ 执行出错:', err.message);
    process.exit(1);
  }
}

main();
