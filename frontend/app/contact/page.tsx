import { redirect } from 'next/navigation'

export default function ContactPage() {
  // Redirect to the support contact page
  redirect('/support/contact-us')
}
