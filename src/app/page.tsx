import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Users, History, Share2 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-[#0A5C36]/5">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter text-[#0A5C36] sm:text-5xl xl:text-6xl/none">
                  Your Family&apos;s Story, Beautifully Preserved
                </h1>
                <p className="max-w-[600px] text-gray-600 md:text-xl">
                  Create, share, and preserve your family&apos;s legacy with Dynasty - the digital family tree and history
                  book platform.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/signup">
                  <Button className="bg-[#0A5C36] hover:bg-[#0A5C36]/90">
                    Start Your Family Tree
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="border-[#C4A55C] text-[#C4A55C] hover:bg-[#C4A55C]/10">
                    Log In
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/dynasty.png"
                alt="Dynasty Family Tree Logo"
                width={400}
                height={400}
                className="w-full max-w-[400px]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tighter text-center text-[#0A5C36] sm:text-4xl mb-12">
            Preserve Your Legacy
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-3 bg-[#0A5C36]/10 rounded-full">
                <Users className="w-6 h-6 text-[#0A5C36]" />
              </div>
              <h3 className="text-xl font-bold text-center">Family Tree</h3>
              <p className="text-center text-gray-600">
                Build and visualize your family connections across generations
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-3 bg-[#0A5C36]/10 rounded-full">
                <BookOpen className="w-6 h-6 text-[#0A5C36]" />
              </div>
              <h3 className="text-xl font-bold text-center">Digital History Book</h3>
              <p className="text-center text-gray-600">
                Document stories, photos, and memories in a beautiful digital format
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-3 bg-[#0A5C36]/10 rounded-full">
                <Share2 className="w-6 h-6 text-[#0A5C36]" />
              </div>
              <h3 className="text-xl font-bold text-center">Easy Sharing</h3>
              <p className="text-center text-gray-600">
                Collaborate with family members and share your history securely
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-3 bg-[#0A5C36]/10 rounded-full">
                <History className="w-6 h-6 text-[#0A5C36]" />
              </div>
              <h3 className="text-xl font-bold text-center">Time Machine</h3>
              <p className="text-center text-gray-600">
                Travel through your family&apos;s timeline and explore your heritage
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 bg-[#0A5C36]/5">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center space-x-2">
              <Image
                src="/dynasty.png"
                alt="Dynasty Logo"
                width={40}
                height={40}
              />
              <span className="text-[#0A5C36] font-bold">Dynasty</span>
            </div>
            <p className="text-sm text-gray-500">© 2024 Dynasty. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}