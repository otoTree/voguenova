import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-8 border-b border-gray-100">
        <h1 className="text-2xl font-bold tracking-widest uppercase">VogueNova</h1>
        <nav className="flex space-x-8 text-sm uppercase tracking-widest text-gray-500">
          <a href="#" className="hover:text-black transition-colors">Models</a>
          <a href="#" className="hover:text-black transition-colors">Studio</a>
          <a href="#" className="hover:text-black transition-colors">Campaigns</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <h2 className="text-6xl font-serif mb-6 tracking-tight">The Future of Virtual Icons</h2>
        <p className="max-w-xl text-gray-500 mb-10 text-lg font-light leading-relaxed">
          Create, style, and direct your AI models with unprecedented realism. Experience the next era of high fashion.
        </p>
        <div className="flex space-x-4">
          <Button className="rounded-none px-8 py-6 text-xs tracking-widest uppercase bg-black text-white hover:bg-gray-800 transition-all">
            Create IP
          </Button>
          <Button variant="outline" className="rounded-none px-8 py-6 text-xs tracking-widest uppercase border-black text-black hover:bg-gray-100 transition-all">
            Enter Studio
          </Button>
        </div>
      </section>

      {/* Main Content - IP Creation */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* IP Generator Form */}
          <Card className="rounded-none border-gray-200 shadow-none">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Design Model</CardTitle>
              <CardDescription className="text-gray-400 font-light">
                Define the persona and physical traits of your virtual model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="uppercase tracking-widest text-xs text-gray-500">Name</Label>
                <Input id="name" placeholder="e.g. Celeste" className="rounded-none border-gray-300 focus-visible:ring-black" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style" className="uppercase tracking-widest text-xs text-gray-500">Aesthetic</Label>
                <Input id="style" placeholder="Minimalist, Haute Couture, Parisienne" className="rounded-none border-gray-300 focus-visible:ring-black" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backstory" className="uppercase tracking-widest text-xs text-gray-500">Backstory & Traits</Label>
                <Textarea id="backstory" placeholder="A mysterious avant-garde muse..." className="rounded-none border-gray-300 focus-visible:ring-black min-h-[120px]" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-none bg-black text-white hover:bg-gray-800 text-xs tracking-widest uppercase py-6">
                Generate Persona
              </Button>
            </CardFooter>
          </Card>

          {/* Preview / Result Area */}
          <div className="bg-gray-50 border border-gray-100 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 border border-black rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-xl font-serif">VN</span>
              </div>
              <p className="text-sm text-gray-400 font-light tracking-wide">AI output will appear here</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
