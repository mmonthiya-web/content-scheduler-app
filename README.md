# 📅 内容排期工具

小红书 / Instagram 内容草稿管理、排期和发布提醒。

## 功能
- 用户注册 / 登录（邮箱）
- 草稿库 — 上传图片、写文案、打标签、字数统计
- 排期日历 — 可视化查看每天发什么
- 发布记录 — 历史内容一览
- 账号管理 — 管理多个 IG / 小红书账号
- Telegram 提醒 — 发布前 30 分钟通知

---

## 部署步骤

### 第一步：Supabase（数据库）

1. 去 [supabase.com](https://supabase.com) 注册免费账号
2. 点 **New Project**，填项目名、数据库密码，选区域（推荐 Singapore）
3. 等待项目创建完成（约 1 分钟）
4. 左边点 **SQL Editor** → 点 **New query**
5. 把 `supabase-schema.sql` 里的全部内容贴进去 → 点 **Run**
6. 左边点 **Project Settings** → **API**
7. 复制 **Project URL** 和 **anon public** key，备用

### 第二步：GitHub（代码托管）

1. 去 [github.com](https://github.com) 新建 repository，名字叫 `content-scheduler`
2. 把这个文件夹里的所有文件上传上去
   - 注意：不要上传 `.env.local`（里面有密钥）
   - `.gitignore` 已经排除了它

### 第三步：Vercel（部署）

1. 去 [vercel.com](https://vercel.com) 用 GitHub 账号登录
2. 点 **Add New Project** → 选你的 `content-scheduler` repository
3. 点开 **Environment Variables**，添加两个变量：
   - `NEXT_PUBLIC_SUPABASE_URL` = 第一步复制的 Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 第一步复制的 anon key
4. 点 **Deploy**，等待约 2 分钟

### 第四步：设置邮箱验证（可选）

1. 回到 Supabase → **Authentication** → **Email Templates**
2. 可以自定义注册确认邮件的内容

完成！你的网址会是 `https://content-scheduler-xxx.vercel.app`

---

## 本地开发

```bash
# 安装依赖
npm install

# 创建 .env.local 文件
cp .env.local.example .env.local
# 填入你的 Supabase URL 和 Key

# 启动开发服务器
npm run dev
```
