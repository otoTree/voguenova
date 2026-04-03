import Link from "next/link"

import { logout } from "@/app/actions/auth"
import { AuthPanel } from "@/components/auth-panel"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import {
  getAdminLoginHint,
  getUserSystemSnapshot,
} from "@/lib/user-system"

export default async function Home() {
  const [snapshot, currentUser] = await Promise.all([
    getUserSystemSnapshot(),
    getCurrentUser(),
  ])
  const adminLoginHint = getAdminLoginHint()

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-black">
        <div className="mx-auto flex h-24 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <nav className="hidden flex-1 md:flex gap-10 text-xs uppercase tracking-[0.3em] font-sans">
            <a href="#vision" className="transition-colors hover:text-neutral-500">愿景</a>
            <a href="#services" className="transition-colors hover:text-neutral-500">工坊服务</a>
          </nav>
          <div className="flex-1 text-center">
            <span className="text-3xl font-heading tracking-[0.2em] uppercase">VogueNova</span>
          </div>
          <div className="flex flex-1 justify-end gap-8 text-xs uppercase tracking-[0.3em] font-sans">
            {currentUser ? (
              <Link href="/workspace" className="transition-colors hover:text-neutral-500">进入工作台</Link>
            ) : (
              <a href="#access" className="transition-colors hover:text-neutral-500">客户通道</a>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        {/* HERO */}
        <section className="relative h-[85vh] w-full flex items-center justify-center bg-neutral-50 overflow-hidden border-b border-black">
          {/* Abstract Fashion Background Placeholder */}
          <div className="absolute inset-0 bg-[#fafafa]">
             <div className="w-full h-full flex flex-col items-center justify-center opacity-[0.03]">
                <div className="w-[40rem] h-[40rem] border border-black rounded-full absolute mix-blend-multiply scale-150"></div>
                <div className="w-[40rem] h-[40rem] border border-black rounded-full absolute mix-blend-multiply translate-x-48"></div>
                <div className="w-[40rem] h-[40rem] border border-black rounded-full absolute mix-blend-multiply -translate-x-48"></div>
             </div>
          </div>
          <div className="relative z-10 text-center px-6 flex flex-col items-center space-y-12">
            <h2 className="text-6xl md:text-8xl lg:text-[11rem] leading-none font-heading uppercase tracking-widest text-black">
              优雅
            </h2>
            <p className="max-w-2xl text-xs md:text-sm font-sans uppercase tracking-[0.5em] text-neutral-500">
              高级定制 • 数字艺术 • 专属呈现
            </p>
            <div className="pt-16">
              <a href="#vision" className="inline-block border-b border-black pb-3 text-xs uppercase tracking-[0.4em] hover:text-neutral-500 hover:border-neutral-500 transition-colors">
                探索数字工坊
              </a>
            </div>
          </div>
        </section>

        {/* VISION & MANIFESTO */}
        <section id="vision" className="mx-auto w-full max-w-6xl px-6 py-40 text-center space-y-20">
          <h3 className="text-xs font-sans uppercase tracking-[0.6em] text-neutral-400">品牌宣言</h3>
          <p className="text-3xl md:text-5xl leading-relaxed font-heading text-black max-w-5xl mx-auto">
            VogueNova 重新定义时尚影像的缔造方式。这是一个专属的数字工坊，品牌与我们的数字匠人无缝协作，共同雕琢量身定制的视觉大片。
          </p>
        </section>

        {/* SERVICES / WORKFLOW */}
        <section id="services" className="border-y border-black bg-white">
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-black">
            <div className="p-20 flex flex-col items-center text-center space-y-12 hover:bg-neutral-50 transition-colors duration-500">
              <span className="text-xs font-sans uppercase tracking-[0.4em] text-neutral-400">01</span>
              <h4 className="text-3xl font-heading uppercase tracking-widest">专属策划</h4>
              <p className="text-sm font-sans leading-loose text-neutral-500 max-w-[280px]">
                品牌伙伴提交专属的大片创意，挑选心仪的数字模特，勾勒出独特的美学愿景。
              </p>
            </div>
            <div className="p-20 flex flex-col items-center text-center space-y-12 hover:bg-neutral-50 transition-colors duration-500">
              <span className="text-xs font-sans uppercase tracking-[0.4em] text-neutral-400">02</span>
              <h4 className="text-3xl font-heading uppercase tracking-widest">工坊统筹</h4>
              <p className="text-sm font-sans leading-loose text-neutral-500 max-w-[280px]">
                工坊管理者悉心梳理每一份创意请求，将品牌愿景与顶尖的数字艺术家完美匹配。
              </p>
            </div>
            <div className="p-20 flex flex-col items-center text-center space-y-12 hover:bg-neutral-50 transition-colors duration-500">
              <span className="text-xs font-sans uppercase tracking-[0.4em] text-neutral-400">03</span>
              <h4 className="text-3xl font-heading uppercase tracking-widest">艺术创作</h4>
              <p className="text-sm font-sans leading-loose text-neutral-500 max-w-[280px]">
                艺术家精心雕琢并打磨最终的视觉杰作，为品牌交付毫不妥协的卓越质感。
              </p>
            </div>
          </div>
        </section>

        {/* CLIENT ACCESS / AUTH */}
        <section id="access" className="mx-auto w-full max-w-[1400px] px-6 py-40 grid lg:grid-cols-[1.1fr_0.9fr] gap-24 items-center">
          <div className="space-y-16">
            <div className="space-y-8">
              <h3 className="text-5xl md:text-6xl font-heading uppercase tracking-widest">客户通道</h3>
              <p className="text-lg font-sans leading-relaxed text-neutral-500 max-w-lg">
                步入 VogueNova 数字工坊。通过专属认证管理您的大片创意、监督制作流程并查阅最终交付的杰作。
              </p>
            </div>
            
            {currentUser ? (
              <div className="space-y-12 pt-12 border-t border-black">
                <div>
                  <p className="text-xs font-sans uppercase tracking-[0.4em] text-neutral-400 mb-6">欢迎回来</p>
                  <p className="text-4xl font-heading uppercase tracking-widest">{currentUser.name}</p>
                  <p className="text-sm font-sans text-neutral-500 mt-4 tracking-widest">{currentUser.email}</p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Button
                    render={<Link href="/workspace" />}
                    nativeButton={false}
                    className="rounded-none bg-black px-12 py-8 text-xs font-sans uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
                  >
                    进入工作台
                  </Button>
                  <form action={logout}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="rounded-none px-12 py-8 text-xs font-sans uppercase tracking-[0.2em] border-black hover:bg-neutral-100 transition-colors"
                    >
                      退出登录
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="pt-12 border-t border-black">
                <p className="text-xs font-sans uppercase tracking-[0.4em] text-neutral-400 mb-10">工坊概览</p>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <p className="text-5xl font-heading">{snapshot.totals.users}</p>
                    <p className="text-xs font-sans uppercase tracking-widest text-neutral-500 mt-4">活跃成员</p>
                  </div>
                  <div>
                    <p className="text-5xl font-heading">{snapshot.totals.pendingRequests}</p>
                    <p className="text-xs font-sans uppercase tracking-widest text-neutral-500 mt-4">制作中的大片</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!currentUser && (
            <div className="lg:pl-16">
              <AuthPanel
                allowSignup={snapshot.source === "database"}
                adminAlias={adminLoginHint.alias}
                adminEmail={adminLoginHint.email}
              />
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black py-20 px-6 lg:px-10 text-center flex flex-col items-center space-y-12 bg-white">
        <span className="text-3xl font-heading tracking-[0.2em] uppercase">VogueNova</span>
        <div className="flex flex-wrap justify-center gap-12 text-xs uppercase tracking-[0.3em] text-neutral-500 font-sans">
          <a href="#" className="hover:text-black transition-colors">Client Services</a>
          <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-black transition-colors">Legal</a>
          <a href="#" className="hover:text-black transition-colors">Careers</a>
        </div>
        <p className="text-xs uppercase tracking-widest text-neutral-400 pt-8">
          &copy; {new Date().getFullYear()} VogueNova. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
