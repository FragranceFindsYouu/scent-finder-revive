import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItem {
  title?: string
  size?: string
  quantity?: number
}

interface Props {
  customerName?: string
  orderNumber?: number | string
  items?: OrderItem[]
  totalCents?: number
  shippingName?: string
  shippingAddress?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  insuranceOptIn?: boolean
  orderUrl?: string
}

const fmt = (cents?: number) =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : ''

const OrderConfirmationEmail = ({
  customerName,
  orderNumber,
  items = [],
  totalCents,
  shippingName,
  shippingAddress,
  insuranceOptIn,
  orderUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your Fragrance Finds You order{orderNumber ? ` #${orderNumber}` : ''} is confirmed
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>FRAGRANCE FINDS YOU</Text>
        <Heading style={heading}>Your order is confirmed</Heading>
        <Text style={text}>
          {customerName ? `Hi ${customerName},` : 'Hi there,'} thank you for your
          order{orderNumber ? ` (#${orderNumber})` : ''}. We're getting your
          fragrances ready.
        </Text>

        {items.length > 0 && (
          <Section style={box}>
            <Text style={boxTitle}>What you ordered</Text>
            {items.map((item, i) => (
              <Text key={i} style={itemLine}>
                {item.quantity ?? 1} × {item.title || 'Fragrance'}
                {item.size ? ` — ${item.size}` : ''}
              </Text>
            ))}
          </Section>
        )}

        {(shippingName || shippingAddress) && (
          <Section style={box}>
            <Text style={boxTitle}>Shipping to</Text>
            {shippingName && <Text style={itemLine}>{shippingName}</Text>}
            {shippingAddress && (
              <Text style={itemLine}>
                {[
                  shippingAddress.line1,
                  shippingAddress.line2,
                  [shippingAddress.city, shippingAddress.state]
                    .filter(Boolean)
                    .join(', '),
                  shippingAddress.postal_code,
                  shippingAddress.country,
                ]
                  .filter(Boolean)
                  .join('\n')}
              </Text>
            )}
          </Section>
        )}

        {insuranceOptIn && (
          <Text style={text}>🛡️ Shipping insurance was added to this order.</Text>
        )}

        {typeof totalCents === 'number' && (
          <>
            <Hr style={hr} />
            <Text style={total}>Total: {fmt(totalCents)}</Text>
          </>
        )}

        {orderUrl && (
          <Section style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href={orderUrl} style={button}>
              View your order
            </Link>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Questions about your order? Just reply to this email and we'll help.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Order confirmed${data.orderNumber ? ` #${data.orderNumber}` : ''} — Fragrance Finds You`,
  displayName: 'Order confirmation',
  previewData: {
    customerName: 'Jane',
    orderNumber: 42,
    items: [
      { title: 'Maison Margiela Replica', size: '5ml', quantity: 1 },
      { title: 'Le Labo Santal 33', size: '10ml', quantity: 2 },
    ],
    totalCents: 6450,
    shippingName: 'Jane Doe',
    shippingAddress: {
      line1: '123 Rose St',
      city: 'Chicago',
      state: 'IL',
      postal_code: '60601',
      country: 'US',
    },
    insuranceOptIn: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = {
  fontSize: '11px',
  letterSpacing: '4px',
  color: '#b76e79',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const heading = {
  fontSize: '26px',
  color: '#2b2122',
  textAlign: 'center' as const,
  fontWeight: '400',
}
const text = { fontSize: '14px', lineHeight: '22px', color: '#4a3f40' }
const box = {
  backgroundColor: '#faf6f4',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '16px 0',
}
const boxTitle = {
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#b76e79',
  margin: '0 0 8px',
}
const itemLine = { fontSize: '14px', color: '#2b2122', margin: '4px 0', whiteSpace: 'pre-line' as const }
const hr = { borderColor: '#eadfe0', margin: '24px 0' }
const total = { fontSize: '16px', color: '#2b2122', textAlign: 'right' as const }
const button = {
  backgroundColor: '#b76e79',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '999px',
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9a8b8c', textAlign: 'center' as const }
