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
import { Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"
import { createSupportTicket } from "@/utils/functionUtils"

const faqs = [
  {
    question: "Can I invite family members to join my Dynasty?",
    answer: "Yes! You can invite family members by accessing your family tree and clicking the 'Invite Members' button. Enter their email addresses and they'll receive an invitation with instructions to join. Once they accept, they'll be able to view, contribute to shared family trees, and add their own stories to your shared history.",
  },
  {
    question: "How do I add stories to my History Book?",
    answer: "Navigate to the 'History Book' section from the main navigation and click 'Create Story'. Our story editor lets you add a title, subtitle, cover photo, location (using our interactive map), and a date for the event. You can build rich content using text blocks, media galleries, and even audio recordings. Tag family members who appear in the story to help connect your family's narratives.",
  },
  {
    question: "How do I control who can see my stories?",
    answer: "Dynasty offers flexible privacy settings for your stories. When creating or editing a story, you can set privacy to 'Family' (visible to all connected family members), 'Private' (only visible to you), or 'Custom' (select specific family members who can view it). You can update these settings at any time from the story options menu.",
  },
  {
    question: "How do I create and manage family events?",
    answer: "Click the '+' button in the navigation bar and select 'Event'. Enter details like title, date, location, and description. You can add a cover photo and invite family members by selecting them from your family tree. Family members will receive invitations and can RSVP directly. You can manage all your events from the 'Events' section of the app.",
  },
  {
    question: "Can I add historical family members who are deceased?",
    answer: "Absolutely! Dynasty is designed to preserve your complete family history. This helps build a comprehensive family tree spanning multiple generations.",
  },
  {
    question: "How do I customize my notification preferences?",
    answer: "Go to 'Account Settings' → 'Notifications' to control what updates you receive. You can toggle notifications for new stories, events, comments, and family tree updates. You can also choose how you receive these notifications (email, in-app, or both).",
  },
  {
    question: "What happens to my data if I delete my account?",
    answer: "When you delete your account, your personal profile information will be permanently removed. For shared content like family trees and history books, ownership will transfer to another family member if possible, or be deleted if no other members are connected.",
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
      <div className="space-y-8 bg-white shadow-xl rounded-xl overflow-hidden p-6 mb-6">
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