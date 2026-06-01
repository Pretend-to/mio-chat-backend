#!/usr/bin/env python3
"""Send thesis reminder email to me@krumio.com"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = "smtp.qq.com"
SMTP_PORT = 465
SMTP_USER = "krumio@qq.com"
SMTP_PASS = "tzjutgighpswgcag"

msg = MIMEMultipart('alternative')
msg['From'] = SMTP_USER
msg['To'] = "me@krumio.com"
msg['Subject'] = "【提醒】请将毕业论文发给老师 📄"

html = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f5f3f0;padding:40px 20px;font-family:'Microsoft YaHei','PingFang SC',sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.06);">

  <div style="text-align:center;font-size:48px;margin-bottom:16px;">⏰</div>
  <h1 style="text-align:center;font-size:26px;color:#1a1a2e;margin:0 0 8px;font-weight:700;">同学，该发论文了！</h1>
  <p style="text-align:center;font-size:14px;color:#999;margin:0 0 28px;">— 来自昨晚你亲自设定的提醒 —</p>

  <div style="background:#f8f7f4;border-radius:12px;padding:24px;margin-bottom:24px;border-left:4px solid #c9a96e;">
    <p style="margin:0 0 6px;font-size:13px;color:#888;">📄 论文题目</p>
    <p style="margin:0;font-size:18px;font-weight:600;color:#1a1a2e;">《基于 Qwen3-Max 的自然语言飞控交互系统设计》</p>
  </div>

  <table style="width:100%;margin-bottom:24px;">
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#666;">👤 作者</td>
      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:600;">王瀚熙（2208070120）</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#666;">🏫 学院</td>
      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;">河北科技大学 · 电气工程学院</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#666;">🎓 专业</td>
      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;">人工智能</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#666;">👨‍🏫 导师</td>
      <td style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:600;">贾江波 老师</td>
    </tr>
  </table>

  <div style="background:#e8f5e9;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#2e7d32;">📎 需要发送的两个文件：</p>
    <p style="margin:0 0 6px;font-size:14px;color:#444;">1️⃣ 王瀚熙毕业论文<b>v1.docx</b></p>
    <p style="margin:0;font-size:14px;color:#444;">2️⃣ 王瀚熙毕业论文<b>v1.pdf</b></p>
  </div>

  <div style="background:#fff8e1;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#e65100;">💡 别忘了附上成绩评定表和原创性声明等材料哦！</p>
  </div>

  <hr style="border:none;border-top:1px solid #f0ede8;margin:24px 0;">

  <p style="text-align:center;font-size:13px;color:#bbb;margin:0;">
    🎓 祝毕业顺利，未来可期！<br>
    <span style="font-size:11px;color:#ddd;">—— MioChat 提醒助手 · 2026年5月6日</span>
  </p>

</div>
</body>
</html>
"""

text = """⏰ 同学，该发论文了！

论文题目：《基于 Qwen3-Max 的自然语言飞控交互系统设计》
作者：王瀚熙（2208070120）
学院：河北科技大学 · 电气工程学院 · 人工智能
导师：贾江波老师

需要发送的两个文件：
1. 王瀚熙毕业论文v1.docx
2. 王瀚熙毕业论文v1.pdf

别忘了附上成绩评定表！

—— MioChat 提醒助手"""

part1 = MIMEText(text, 'plain', 'utf-8')
part2 = MIMEText(html, 'html', 'utf-8')
msg.attach(part1)
msg.attach(part2)

try:
    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(SMTP_USER, ["me@krumio.com"], msg.as_string())
    server.quit()
    print("✅ 邮件发送成功！")
except Exception as e:
    print(f"❌ 邮件发送失败: {e}")
