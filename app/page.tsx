'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    if (mode === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) setError(e.message)
      else setDone(true)
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) setError(e.message === 'Invalid login credentials' ? '邮箱或密码错误' : e.message)
      else router.replace('/dashboard')
    }
    setLoading(false)
  }

  if (done) return (
    <div className="auth-page">
      <div className="auth-box" style={{textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'1rem'}}>📧</div>
        <h1>请验证你的邮箱</h1>
        <p style={{marginTop:'0.5rem'}}>我们已发送确认邮件到 <strong>{email}</strong>，点击邮件里的链接后即可登录。</p>
        <button className="btn btn-ghost" style={{marginTop:'1.5rem',width:'100%',justifyContent:'center'}} onClick={()=>setDone(false)}>返回登录</button>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>📅 内容排期</h1>
        <p>{mode === 'login' ? '登录你的账号继续' : '创建账号，开始管理你的内容'}</p>
        {error && <div className="auth-error">{error}</div>}
        <div className="field">
          <label>邮箱</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
        </div>
        <div className="field">
          <label>密码</label>
          <input type="password" placeholder="至少 6 位" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
        </div>
        <button className={`btn btn-primary${loading?' loading':''}`} style={{width:'100%',justifyContent:'center',marginTop:'0.5rem'}} onClick={submit} disabled={loading}>
          {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
        </button>
        <div className="auth-switch">
          {mode === 'login' ? <>还没有账号？<button onClick={()=>{setMode('signup');setError('')}}>注册</button></> : <>已有账号？<button onClick={()=>{setMode('login');setError('')}}>登录</button></>}
        </div>
      </div>
    </div>
  )
}
