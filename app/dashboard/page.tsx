'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Platform = 'ig' | 'xhs'
type Status = 'draft' | 'scheduled' | 'published'

interface Post {
  id: string; emoji: string; img_url: string; title: string; copy: string;
  tags: string; platforms: Platform[]; account_ids: string[]; scheduled_at: string | null;
  status: Status; reminder: boolean; user_id: string; created_at: string;
}
interface Account {
  id: string; platform: Platform; name: string; handle: string; user_id: string;
}

const EMOJIS = ['📸','🌟','💫','🎨','🖼️','🌈','🍀','🔥','✨','🎯']
const XHS_MAX = 1000, IG_MAX = 2200

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [posts, setPosts] = useState<Post[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<'drafts'|'calendar'|'history'|'accounts'>('drafts')
  const [draftFilter, setDraftFilter] = useState('all')
  const [histFilter, setHistFilter] = useState('all')
  const [calMonth, setCalMonth] = useState(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  // Modal states
  const [postModal, setPostModal] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [detailModal, setDetailModal] = useState(false)
  const [detailPost, setDetailPost] = useState<Post|null>(null)
  const [accModal, setAccModal] = useState(false)
  const [editAccId, setEditAccId] = useState<string|null>(null)
  const [tgModal, setTgModal] = useState(false)
  const [tgToken, setTgToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [tgResult, setTgResult] = useState('')
  // Post form
  const [fTitle, setFTitle] = useState('')
  const [fCopy, setFCopy] = useState('')
  const [fTags, setFTags] = useState('')
  const [fPlatforms, setFPlatforms] = useState<Platform[]>([])
  const [fAccounts, setFAccounts] = useState<string[]>([])
  const [fDate, setFDate] = useState('')
  const [fHour, setFHour] = useState('')
  const [fMin, setFMin] = useState('00')
  const [fReminder, setFReminder] = useState(false)
  const [fImg, setFImg] = useState<string>('')
  // Acc form
  const [aPlatform, setAPlatform] = useState<Platform>('ig')
  const [aName, setAName] = useState('')
  const [aHandle, setAHandle] = useState('')

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2200)
  }

  const loadData = useCallback(async (uid: string) => {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('posts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
    ])
    if (p) setPosts(p)
    if (a) setAccounts(a)
    // load tg settings from localStorage (per user)
    const saved = localStorage.getItem(`tg_${uid}`)
    if (saved) { const t = JSON.parse(saved); setTgToken(t.token||''); setTgChatId(t.chatId||'') }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }
      setUserId(session.user.id)
      setUserEmail(session.user.email || '')
      await loadData(session.user.id)
    }
    init()
  }, [router, supabase, loadData])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  // ---- POSTS ----
  const fmtTime = (t: string | null) => {
    if (!t) return ''
    const d = new Date(t)
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const openPostModal = (id?: string) => {
    setEditId(id || null)
    if (id) {
      const p = posts.find(x => x.id === id)!
      setFTitle(p.title); setFCopy(p.copy); setFTags(p.tags)
      setFPlatforms(p.platforms); setFAccounts(p.account_ids||[])
      setFReminder(p.reminder); setFImg(p.img_url||'')
      if (p.scheduled_at) {
        const d = new Date(p.scheduled_at)
        setFDate(d.toISOString().split('T')[0])
        setFHour(String(d.getHours()).padStart(2,'0'))
        setFMin(String(d.getMinutes()).padStart(2,'0'))
      } else { setFDate(''); setFHour(''); setFMin('00') }
    } else {
      setFTitle(''); setFCopy(''); setFTags(''); setFPlatforms([]); setFAccounts([])
      setFDate(''); setFHour(''); setFMin('00'); setFReminder(false); setFImg('')
    }
    setPostModal(true)
  }

  const savePost = async () => {
    if (!userId) return
    const scheduled_at = fDate && fHour ? `${fDate}T${fHour}:${fMin}:00` : null
    const data = {
      emoji: EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      img_url: fImg, title: fTitle||'无标题草稿', copy: fCopy, tags: fTags,
      platforms: fPlatforms, account_ids: fAccounts,
      scheduled_at, status: scheduled_at ? 'scheduled' : 'draft' as Status,
      reminder: fReminder, user_id: userId,
    }
    if (editId) {
      const { error } = await supabase.from('posts').update(data).eq('id', editId)
      if (!error) { toast('草稿已更新 ✓'); await loadData(userId) }
    } else {
      const { error } = await supabase.from('posts').insert(data)
      if (!error) { toast('草稿已保存 ✓'); await loadData(userId) }
    }
    setPostModal(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('确定删除？') || !userId) return
    await supabase.from('posts').delete().eq('id', id)
    toast('已删除'); await loadData(userId)
    setDetailModal(false); setPostModal(false)
  }

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFImg(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ---- ACCOUNTS ----
  const openAccModal = (id?: string) => {
    setEditAccId(id || null)
    if (id) {
      const a = accounts.find(x => x.id === id)!
      setAPlatform(a.platform); setAName(a.name); setAHandle(a.handle)
    } else { setAPlatform('ig'); setAName(''); setAHandle('') }
    setAccModal(true)
  }

  const saveAcc = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { toast('请重新登录'); return }
  
  const data = { 
    platform: aPlatform, 
    name: aName||'未命名账号', 
    handle: aHandle, 
    user_id: session.user.id 
  }
  
  if (editAccId) {
    const { error } = await supabase.from('accounts').update(data).eq('id', editAccId)
    if (error) { toast('错误: ' + error.message); return }
    toast('账号已更新 ✓')
  } else {
    const { error } = await supabase.from('accounts').insert(data)
    if (error) { toast('错误: ' + error.message); return }
    toast('账号已添加 ✓')
  }
  await loadData(session.user.id); setAccModal(false)
}

  // ---- TELEGRAM ----
  const saveTg = () => {
    if (!userId) return
    localStorage.setItem(`tg_${userId}`, JSON.stringify({ token: tgToken, chatId: tgChatId }))
    toast('Telegram 设置已保存 ✓'); setTgModal(false)
  }

  const testTg = async () => {
    setTgResult('发送中…')
    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: '✅ 内容排期工具连接成功！将在发布前 30 分钟提醒你。' })
      })
      setTgResult(r.ok ? '✓ 发送成功！' : '✗ 发送失败，请检查 Token 和 Chat ID。')
    } catch { setTgResult('✗ 发送失败') }
  }

  // ---- FILTERS ----
  const filteredPosts = posts.filter(p => {
    if (draftFilter === 'draft') return p.status === 'draft'
    if (draftFilter === 'scheduled') return p.status === 'scheduled'
    if (draftFilter === 'ig') return p.platforms.includes('ig')
    if (draftFilter === 'xhs') return p.platforms.includes('xhs')
    return true
  })

  const filteredHistory = posts.filter(p => {
    if (histFilter === 'published') return p.status === 'published'
    if (histFilter === 'scheduled') return p.status === 'scheduled'
    if (histFilter === 'ig') return p.platforms.includes('ig')
    if (histFilter === 'xhs') return p.platforms.includes('xhs')
    return true
  }).sort((a,b) => new Date(b.scheduled_at||b.created_at).getTime() - new Date(a.scheduled_at||a.created_at).getTime())

  // ---- CALENDAR ----
  const calYear = calMonth.getFullYear(), calMon = calMonth.getMonth()
  const scheduledPosts = posts.filter(p => p.scheduled_at && p.status === 'scheduled')
  const calDays = () => {
    const first = new Date(calYear, calMon, 1).getDay()
    const days = new Date(calYear, calMon+1, 0).getDate()
    const today = new Date()
    const cells = []
    for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} className="cal-day other"><div className="cal-num"></div></div>)
    for (let d = 1; d <= days; d++) {
      const isToday = today.getFullYear()===calYear && today.getMonth()===calMon && today.getDate()===d
      const dayPosts = scheduledPosts.filter(p => {
        const pd = new Date(p.scheduled_at!); return pd.getFullYear()===calYear && pd.getMonth()===calMon && pd.getDate()===d
      })
      cells.push(
        <div key={d} className={`cal-day${isToday?' today':''}`}>
          <div className="cal-num">{d}</div>
          {dayPosts.map(p => (
            <div key={p.id} className={`cal-chip ${p.platforms.length>1?'both':p.platforms[0]}`}
              onClick={()=>{ setDetailPost(p); setDetailModal(true) }}>
              {p.emoji} {p.title}
            </div>
          ))}
        </div>
      )
    }
    return cells
  }

  // ---- STAT helpers ----
  const thisMonthPublished = posts.filter(p => {
    if (p.status !== 'published') return false
    const d = new Date(p.scheduled_at || p.created_at)
    return d.getFullYear()===calYear && d.getMonth()===calMon
  }).length
  const thisMonthPending = scheduledPosts.filter(p => {
    const d = new Date(p.scheduled_at!)
    return d.getFullYear()===calYear && d.getMonth()===calMon
  }).length

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text3)'}}>加载中…</div>

  const pageTitle = {drafts:'草稿库',calendar:'排期日历',history:'发布记录',accounts:'账号管理'}[page]

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <nav className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-logo">
          <h1>📅 内容排期</h1>
          <p>小红书 · Instagram</p>
        </div>
        <button className={`nav-item${page==='drafts'?' active':''}`} onClick={()=>{setPage('drafts');setSidebarOpen(false)}}><i className="ti ti-files"></i> 草稿库</button>
        <button className={`nav-item${page==='calendar'?' active':''}`} onClick={()=>{setPage('calendar');setSidebarOpen(false)}}><i className="ti ti-calendar"></i> 排期日历</button>
        <button className={`nav-item${page==='history'?' active':''}`} onClick={()=>{setPage('history');setSidebarOpen(false)}}><i className="ti ti-clock-hour-4"></i> 发布记录</button>
        <div className="nav-section">设置</div>
        <button className={`nav-item${page==='accounts'?' active':''}`} onClick={()=>{setPage('accounts');setSidebarOpen(false)}}><i className="ti ti-users"></i> 账号管理</button>
        <button className="nav-item" onClick={()=>{setTgToken(localStorage.getItem(`tg_${userId}`) ? JSON.parse(localStorage.getItem(`tg_${userId}`)!).token||'' : ''); setTgChatId(localStorage.getItem(`tg_${userId}`) ? JSON.parse(localStorage.getItem(`tg_${userId}`)!).chatId||'' : ''); setTgResult(''); setTgModal(true); setSidebarOpen(false)}}><i className="ti ti-brand-telegram"></i> Telegram 提醒</button>
        <div className="sidebar-bottom">
          <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userEmail}</div>
          <button className="btn btn-ghost btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={signOut}><i className="ti ti-logout"></i> 登出</button>
        </div>
      </nav>

      <div className="overlay" style={{display:sidebarOpen?'block':'none'}} onClick={()=>setSidebarOpen(false)}></div>

      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button className="hamburger" onClick={()=>setSidebarOpen(!sidebarOpen)}><i className="ti ti-menu-2"></i></button>
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm" onClick={()=>openPostModal()}><i className="ti ti-plus"></i> <span>新建</span></button>
          </div>
        </div>

        <div className="content">

          {/* DRAFTS */}
          {page === 'drafts' && (
            <>
              <div className="stat-grid">
                <div className="stat-card accent"><div className="stat-label">草稿总数</div><div className="stat-value">{posts.length}</div><div className="stat-sub">{posts.filter(p=>p.status==='scheduled').length} 已排期</div></div>
                <div className="stat-card"><div className="stat-label">未发布草稿</div><div className="stat-value">{posts.filter(p=>p.status==='draft').length}</div><div className="stat-sub">待排期</div></div>
                <div className="stat-card"><div className="stat-label">Instagram</div><div className="stat-value">{posts.filter(p=>p.platforms.includes('ig')).length}</div><div className="stat-sub">篇内容</div></div>
                <div className="stat-card"><div className="stat-label">小红书</div><div className="stat-value">{posts.filter(p=>p.platforms.includes('xhs')).length}</div><div className="stat-sub">篇内容</div></div>
              </div>
              <div className="filter-tabs">
                {[['all','全部'],['draft','草稿'],['scheduled','已排期'],['ig','Instagram'],['xhs','小红书']].map(([f,l])=>(
                  <button key={f} className={`filter-tab${draftFilter===f?' active'+(f==='ig'?'-ig':f==='xhs'?'-xhs':''):''}`} onClick={()=>setDraftFilter(f)}>{l}</button>
                ))}
              </div>
              <div className="draft-grid">
                {filteredPosts.map(p => (
                  <div key={p.id} className="draft-card" onClick={()=>{setDetailPost(p);setDetailModal(true)}}>
                    <div className="draft-thumb">
                      {p.img_url ? <img src={p.img_url} alt="" /> : <span>{p.emoji}</span>}
                      <div className="draft-thumb-acc">
                        {p.platforms.includes('ig') && <span className="tag tag-ig" style={{fontSize:'9px',padding:'1px 5px'}}>IG</span>}
                        {p.platforms.includes('xhs') && <span className="tag tag-xhs" style={{fontSize:'9px',padding:'1px 5px'}}>XHS</span>}
                      </div>
                    </div>
                    <div className="card-actions" onClick={e=>e.stopPropagation()}>
                      <button className="btn-icon" onClick={()=>openPostModal(p.id)}><i className="ti ti-edit"></i></button>
                      <button className="btn-icon del" onClick={()=>deletePost(p.id)}><i className="ti ti-trash"></i></button>
                    </div>
                    <div className="draft-body">
                      <div className="draft-title">{p.title}</div>
                      <div className="draft-time">
                        <span className={`dot dot-${p.status}`}></span>
                        <span>{p.status==='draft'?'草稿':fmtTime(p.scheduled_at)}</span>
                        {p.reminder && p.scheduled_at && <i className="ti ti-brand-telegram" style={{fontSize:'11px',color:'var(--tg)',marginLeft:'2px'}}></i>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="add-card" onClick={()=>openPostModal()}>
                  <i className="ti ti-plus" style={{fontSize:'28px'}}></i>
                  <span style={{fontSize:'13px'}}>新建草稿</span>
                </div>
              </div>
            </>
          )}

          {/* CALENDAR */}
          {page === 'calendar' && (
            <>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-label">本月已发布</div><div className="stat-value">{thisMonthPublished}</div><div className="stat-sub">篇</div></div>
                <div className="stat-card accent"><div className="stat-label">本月待发布</div><div className="stat-value">{thisMonthPending}</div><div className="stat-sub">已排期</div></div>
                <div className="stat-card"><div className="stat-label">本月总计</div><div className="stat-value">{thisMonthPublished+thisMonthPending}</div><div className="stat-sub">篇内容</div></div>
              </div>
              <div className="cal-nav">
                <button className="btn btn-ghost btn-sm" onClick={()=>setCalMonth(new Date(calYear,calMon-1,1))}><i className="ti ti-chevron-left"></i></button>
                <span className="cal-nav-title">{calYear}年{calMon+1}月</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>setCalMonth(new Date(calYear,calMon+1,1))}><i className="ti ti-chevron-right"></i></button>
              </div>
              <div className="cal-grid">
                {['日','一','二','三','四','五','六'].map(d=><div key={d} className="cal-head">{d}</div>)}
              </div>
              <div className="cal-grid" style={{marginTop:'3px'}}>{calDays()}</div>
            </>
          )}

          {/* HISTORY */}
          {page === 'history' && (
            <>
              <div className="filter-tabs">
                {[['all','全部'],['published','已发布'],['scheduled','待发布'],['ig','Instagram'],['xhs','小红书']].map(([f,l])=>(
                  <button key={f} className={`filter-tab${histFilter===f?' active'+(f==='ig'?'-ig':f==='xhs'?'-xhs':''):''}`} onClick={()=>setHistFilter(f)}>{l}</button>
                ))}
              </div>
              <div className="history-list">
                {filteredHistory.length === 0 && <div className="empty">暂无记录</div>}
                {filteredHistory.map(p => (
                  <div key={p.id} className="hist-item" onClick={()=>{setDetailPost(p);setDetailModal(true)}}>
                    <div className="hist-thumb">{p.img_url?<img src={p.img_url} alt=""/>:p.emoji}</div>
                    <div className="hist-info">
                      <div className="hist-title">{p.title}</div>
                      <div className="hist-meta">
                        {p.platforms.map(pl=><span key={pl} className={`tag tag-${pl}`}>{pl==='ig'?'Instagram':'小红书'}</span>)}
                        <span>{fmtTime(p.scheduled_at||p.created_at)}</span>
                      </div>
                    </div>
                    <span className={`tag tag-${p.status}`}>
                      <i className={`ti ti-${p.status==='published'?'check':'clock'}`} style={{fontSize:'10px'}}></i>
                      {p.status==='published'?'已发布':p.status==='scheduled'?'待发布':'草稿'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ACCOUNTS */}
          {page === 'accounts' && (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div>
                  <div style={{fontSize:'15px',fontWeight:600,marginBottom:'2px'}}>账号管理</div>
                  <div style={{fontSize:'12px',color:'var(--text3)'}}>管理你的 Instagram 和小红书账号</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>openAccModal()}><i className="ti ti-plus"></i> 添加账号</button>
              </div>
              <div className="acc-grid">
                {accounts.map(a => (
                  <div key={a.id} className="acc-card" onClick={()=>openAccModal(a.id)}>
                    <div className="acc-avatar" style={{background:a.platform==='ig'?'var(--ig-bg)':'var(--xhs-bg)',fontSize:'20px'}}>{a.platform==='ig'?'📸':'📕'}</div>
                    <div className="acc-info">
                      <div className="acc-name">{a.name}</div>
                      <div className="acc-handle">{a.handle}</div>
                      <div className="acc-platform" style={{color:a.platform==='ig'?'var(--ig-text)':'var(--xhs-text)'}}>{a.platform==='ig'?'Instagram':'小红书'}</div>
                    </div>
                    <div className="acc-actions" onClick={e=>e.stopPropagation()}>
                      <button className="btn-icon" onClick={()=>openAccModal(a.id)}><i className="ti ti-edit"></i></button>
                    </div>
                  </div>
                ))}
                <div className="acc-card add-acc" onClick={()=>openAccModal()}>
                  <i className="ti ti-plus" style={{fontSize:'24px'}}></i>
                  <span style={{fontSize:'13px'}}>添加账号</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* POST MODAL */}
      <div className={`modal-bg${postModal?' open':''}`} onClick={e=>e.target===e.currentTarget&&setPostModal(false)}>
        <div className="modal">
          <h3>{editId ? '编辑草稿' : '新建草稿'}</h3>
          <div className="field">
            <label>封面图</label>
            <div className="img-drop" onClick={()=>document.getElementById('imgInput')?.click()}>
              {fImg ? <><img src={fImg} alt="" /><div className="img-overlay"><i className="ti ti-refresh"></i> 更换</div></> : <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',color:'var(--text3)'}}><i className="ti ti-photo-up" style={{fontSize:'28px'}}></i><span>点击上传图片</span></div>}
            </div>
            <input id="imgInput" type="file" accept="image/*" style={{display:'none'}} onChange={handleImg} />
          </div>
          <div className="field"><label>标题</label><input type="text" value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="帖子标题…" /></div>
          <div className="field">
            <label>文案</label>
            <textarea value={fCopy} onChange={e=>setFCopy(e.target.value)} placeholder="写下你的文案…" />
            <div>
              {(fPlatforms.length ? fPlatforms : ['xhs','ig'] as Platform[]).map(pl => {
                const max = pl==='xhs'?XHS_MAX:IG_MAX, len=fCopy.length, pct=Math.min(len/max,1)
                const over=len>max, warn=len>max*0.9
                return <div key={pl} className="char-bar-row">
                  <div className="char-info"><span className="char-label">{pl==='xhs'?'小红书':'Instagram'}</span><span className={`char-num${over?' over':warn?' warn':''}`}>{len}/{max}{over?' ⚠️':''}</span></div>
                  <div className="char-track"><div className="char-fill" style={{width:`${pct*100}%`,background:over?'var(--danger)':warn?'var(--warn)':pl==='xhs'?'var(--success)':'var(--ig)'}}></div></div>
                </div>
              })}
            </div>
          </div>
          <div className="field"><label>标签</label><input type="text" value={fTags} onChange={e=>setFTags(e.target.value)} placeholder="#标签1 #标签2" /></div>
          <div className="field">
            <label>发布平台</label>
            <div className="platform-row">
              {(['ig','xhs'] as Platform[]).map(pl => (
                <button key={pl} className={`platform-btn${fPlatforms.includes(pl)?' on-'+pl:''}`} onClick={()=>setFPlatforms(prev=>prev.includes(pl)?prev.filter(x=>x!==pl):[...prev,pl])}>
                  <i className={`ti ti-brand-${pl==='ig'?'instagram':'letter-x'}`}></i> {pl==='ig'?'Instagram':'小红书'}
                </button>
              ))}
            </div>
          </div>
          {accounts.filter(a=>fPlatforms.includes(a.platform)).length > 0 && (
            <div className="field">
              <label>选择账号</label>
              <div className="acc-picker">
                {accounts.filter(a=>fPlatforms.includes(a.platform)).map(a=>(
                  <button key={a.id} className={`acc-chip${fAccounts.includes(a.id)?' selected':''}`} onClick={()=>setFAccounts(prev=>prev.includes(a.id)?prev.filter(x=>x!==a.id):[...prev,a.id])}>{a.name}</button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label>定时发布</label>
            <div className="datetime-row">
              <input type="date" value={fDate} onChange={e=>{setFDate(e.target.value);if(!e.target.value){setFHour('');setFReminder(false)}}} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <select value={fHour} onChange={e=>setFHour(e.target.value)}>
                  <option value="">时</option>
                  {Array.from({length:24},(_,i)=><option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}时</option>)}
                </select>
                <select value={fMin} onChange={e=>setFMin(e.target.value)}>
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m}>{m}分</option>)}
                </select>
              </div>
            </div>
          </div>
          {fDate && fHour && (
            <div>
              <div className="reminder-row">
                <span style={{fontSize:'13px',display:'flex',alignItems:'center',gap:'8px'}}><i className="ti ti-brand-telegram" style={{color:'var(--tg)',fontSize:'17px'}}></i> 发布前 30 分钟 Telegram 提醒</span>
                <button className={`toggle${fReminder?' on':''}`} onClick={()=>setFReminder(!fReminder)}></button>
              </div>
              {fReminder && !tgToken && <div style={{fontSize:'11px',color:'var(--warn)',marginTop:'5px',paddingLeft:'4px'}}><i className="ti ti-alert-triangle"></i> 请先在侧栏设置 Telegram Bot</div>}
            </div>
          )}
          <div className="modal-footer">
            <div>{editId && <button className="btn btn-danger btn-sm" onClick={()=>deletePost(editId)}><i className="ti ti-trash"></i> 删除</button>}</div>
            <div className="modal-footer-right">
              <button className="btn btn-ghost" onClick={()=>setPostModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={savePost}>保存草稿</button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <div className={`modal-bg${detailModal?' open':''}`} onClick={e=>e.target===e.currentTarget&&setDetailModal(false)}>
        {detailPost && <div className="modal">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',gap:'8px'}}>
            <h3 style={{margin:0,flex:1}}>{detailPost.title}</h3>
            <span className={`tag tag-${detailPost.status}`}>{detailPost.status==='published'?'已发布':detailPost.status==='scheduled'?'待发布':'草稿'}</span>
          </div>
          <div className="detail-img">{detailPost.img_url?<img src={detailPost.img_url} alt=""/>:<span style={{fontSize:'56px'}}>{detailPost.emoji}</span>}</div>
          <div className="detail-copy">{detailPost.copy||'（暂无文案）'}</div>
          <div>
            <div className="detail-row">{detailPost.platforms.map(pl=><span key={pl} className={`tag tag-${pl}`}>{pl==='ig'?'Instagram':'小红书'}</span>)}</div>
            {detailPost.tags && <div className="detail-row"><i className="ti ti-hash" style={{fontSize:'14px'}}></i> {detailPost.tags}</div>}
            {detailPost.scheduled_at && <div className="detail-row"><i className="ti ti-clock" style={{fontSize:'14px'}}></i> {detailPost.status==='published'?'发布于':'定时：'} {fmtTime(detailPost.scheduled_at)}</div>}
            {detailPost.reminder && detailPost.scheduled_at && <div className="detail-row" style={{color:'var(--tg)'}}><i className="ti ti-brand-telegram" style={{fontSize:'14px'}}></i> Telegram 提醒已开启</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={()=>deletePost(detailPost.id)}><i className="ti ti-trash"></i> 删除</button>
            <div className="modal-footer-right">
              <button className="btn btn-ghost" onClick={()=>setDetailModal(false)}>关闭</button>
              <button className="btn btn-primary" onClick={()=>{setDetailModal(false);openPostModal(detailPost.id)}}><i className="ti ti-edit"></i> 编辑</button>
            </div>
          </div>
        </div>}
      </div>

      {/* ACCOUNT MODAL */}
      <div className={`modal-bg${accModal?' open':''}`} onClick={e=>e.target===e.currentTarget&&setAccModal(false)}>
        <div className="modal" style={{maxWidth:'420px'}}>
          <h3>{editAccId?'编辑账号':'添加账号'}</h3>
          <div className="field"><label>平台</label><select value={aPlatform} onChange={e=>setAPlatform(e.target.value as Platform)}><option value="ig">Instagram</option><option value="xhs">小红书</option></select></div>
          <div className="field"><label>账号名称</label><input type="text" value={aName} onChange={e=>setAName(e.target.value)} placeholder="eg. 品牌官方号" /></div>
          <div className="field"><label>用户名 / Handle</label><input type="text" value={aHandle} onChange={e=>setAHandle(e.target.value)} placeholder="@username" /></div>
          <div className="modal-footer">
            <div>{editAccId && <button className="btn btn-danger btn-sm" onClick={deleteAcc}><i className="ti ti-trash"></i> 删除</button>}</div>
            <div className="modal-footer-right">
              <button className="btn btn-ghost" onClick={()=>setAccModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveAcc}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* TELEGRAM MODAL */}
      <div className={`modal-bg${tgModal?' open':''}`} onClick={e=>e.target===e.currentTarget&&setTgModal(false)}>
        <div className="modal" style={{maxWidth:'460px'}}>
          <h3><i className="ti ti-brand-telegram" style={{color:'var(--tg)'}}></i> Telegram 提醒设置</h3>
          <p style={{fontSize:'13px',color:'var(--text2)',marginBottom:'1rem',lineHeight:1.7}}>设置后，帖子发布前 30 分钟会自动发 Telegram 消息提醒你。</p>
          <div className="tg-step">
            <strong style={{color:'var(--text)'}}>三步完成：</strong><br/>
            1. Telegram 搜索 <code>@BotFather</code>，发 <code>/newbot</code> 创建 Bot 获得 Token<br/>
            2. 给 Bot 发一条消息，访问 <code>api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> 找 <code>chat.id</code><br/>
            3. 填入下方，点测试
          </div>
          <div className="field"><label>Bot Token</label><input type="text" value={tgToken} onChange={e=>setTgToken(e.target.value)} placeholder="123456:ABC-DEF…" /></div>
          <div className="field"><label>Chat ID</label><input type="text" value={tgChatId} onChange={e=>setTgChatId(e.target.value)} placeholder="123456789" /></div>
          {tgResult && <div style={{fontSize:'12px',marginTop:'4px',color:tgResult.startsWith('✓')?'var(--success)':'var(--danger)'}}>{tgResult}</div>}
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setTgModal(false)}>取消</button>
            <div className="modal-footer-right">
              <button className="btn btn-ghost" onClick={testTg}><i className="ti ti-send"></i> 测试</button>
              <button className="btn btn-tg" onClick={saveTg}><i className="ti ti-check"></i> 保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast${toastMsg?' show':''}`}>{toastMsg}</div>
    </div>
  )
}
