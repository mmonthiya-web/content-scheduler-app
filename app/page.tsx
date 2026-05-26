'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/dashboard' : '/auth')
    }
    check()
  }, [router])
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#999'}}>Loading…</div>
}
