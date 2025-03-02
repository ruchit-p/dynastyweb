"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle, Mail, MessageSquare, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"
import { createSupportTicket } from "@/utils/functionUtils"

const faqs = [
  {
    question: "How do I create a family tree?",
    answer: "To create a family tree, click on the 'Create Tree' button on your dashboard. Follow the step-by-step guide to add family members and establish relationships.",
  },
  {
    question: "Can I invite family members to join?",
    answer: "Yes! Once you've created a family tree, you can invite family members by clicking the 'Invite Members' button and entering their email addresses.",
  },
  {
    question: "How do I add stories to my history book?",
    answer: "Navigate to the History Book section and click 'Write a Story'. You can add text, photos, videos, and audio to preserve your family memories.",
  },
  {
    question: "What happens to my data if I delete my account?",
    answer: "When you delete your account, all your personal information and stories will be permanently removed. Family trees you've created will be transferred to another family member if available.",
  },
]

export default function HelpSupportPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject || !message) {
      toast({
        title: "Missing Information",
        description: "Please provide both a subject and a message.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsSending(true)
      
      // Submit support ticket to Firebase
      const response = await createSupportTicket(subject, message)
      
      if (response.success) {
        toast({
          title: "Thank you for your feedback",
          description: "Your message has been sent.",
        })
        setSubject("")
        setMessage("")
      } else {
        throw new Error("Failed to create support ticket")
      }
    } catch (error) {
      console.error("Error submitting support ticket:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-8 bg-white shadow-xl rounded-xl overflow-hidden p-6">
        <div>
          <h3 className="text-lg font-medium">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="mt-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-medium">Contact Support</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Need help? Send us a message and we&apos;ll get back to you.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div>
              <Textarea
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[150px]"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-lg font-medium">Additional Resources</h3>
          <div className="grid gap-4 mt-4">
            <a
              href="mailto:support@mydynastyapp.com"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              Email Support
            </a>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 