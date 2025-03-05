"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { HelpCircle, Mail, MessageSquare, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function HelpSupportPage() {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message before submitting.",
        variant: "destructive",
      })
      return
    }
    
    setIsSending(true)
    
    // Simulate sending a message
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We'll get back to you soon.",
      })
      setMessage("")
      setIsSending(false)
    }, 1500)
  }
  
  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-[#0A5C36]">Help & Support</h1>
      
      <div className="space-y-8">
        {/* FAQs Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">Frequently Asked Questions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-base font-medium">
                How do I create a family tree?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                To create a family tree, navigate to the Family Tree page and click on "Create New Tree" button. 
                Follow the prompts to add your first family member, which will be the root of your tree. 
                From there, you can add more family members and their relationships.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-base font-medium">
                How can I invite family members to join?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                You can invite family members by going to your Family Tree page, clicking on the "Invite" button, 
                and entering their email addresses. They'll receive an invitation with instructions to join your family tree.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-base font-medium">
                What is a History Book?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                A History Book is a collection of stories, photos, and other media that you can create to document 
                your family's history. Think of it as a digital scrapbook where you can preserve memories and share them with family members.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-base font-medium">
                How do I change my privacy settings?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                You can adjust your privacy settings by navigating to Account Settings &gt; Privacy & Security. 
                There, you can control who can see your information, manage location services, and set data retention preferences.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        
        {/* Contact Support Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">Contact Support</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="h-5 w-5 text-[#0A5C36]" />
                <label htmlFor="support-message" className="text-base font-medium">
                  Message
                </label>
              </div>
              <Textarea
                id="support-message"
                placeholder="Describe your issue or question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSending}
                className="bg-[#0A5C36] hover:bg-[#0A5C36]/90"
              >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>
        
        {/* Additional Resources */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">Additional Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="#" 
              className="flex items-center p-4 border rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="bg-[#F9FAFB] p-2 rounded-lg mr-3">
                <HelpCircle className="h-5 w-5 text-[#0A5C36]" />
              </div>
              <div>
                <h3 className="font-medium">Help Center</h3>
                <p className="text-sm text-gray-500">Browse our documentation</p>
              </div>
            </a>
            
            <a 
              href="#" 
              className="flex items-center p-4 border rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="bg-[#F9FAFB] p-2 rounded-lg mr-3">
                <Mail className="h-5 w-5 text-[#0A5C36]" />
              </div>
              <div>
                <h3 className="font-medium">Email Support</h3>
                <p className="text-sm text-gray-500">support@dynasty.com</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </>
  )
} 