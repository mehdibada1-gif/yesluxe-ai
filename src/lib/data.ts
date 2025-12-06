import type { Property } from './types';
import { PlaceHolderImages } from './placeholder-images';

const mediaPlaceholders = PlaceHolderImages.filter(p => !p.id.includes('avatar'));

export const propertyData: Property = {
  id: 'prop-123',
  name: 'The Oceanfront Villa',
  description:
    'Escape to this stunning oceanfront villa, where modern luxury meets tranquil coastal living. Enjoy breathtaking panoramic views of the sea from every room, a private infinity pool, and direct beach access. The spacious, open-concept living area and state-of-the-art kitchen are perfect for relaxing and entertaining. With beautifully appointed bedrooms and spa-like bathrooms, this villa is your ultimate seaside sanctuary.',
  address: '123 Ocean Drive, Malibu, CA',
  media: mediaPlaceholders,
  amenities: [
    { name: 'Fast WiFi', icon: 'Wifi' },
    { name: '3 Bedrooms', icon: 'BedDouble' },
    { name: '3.5 Bathrooms', icon: 'Bath' },
    { name: 'Fully Equipped Kitchen', icon: 'UtensilsCrossed' },
    { name: 'Free Parking', icon: 'ParkingCircle' },
    { name: 'Air Conditioning', icon: 'Wind' },
    { name: 'Smart TV with Netflix', icon: 'Tv' },
  ],
  rules: [
    'No smoking inside the villa.',
    'No parties or events.',
    'Quiet hours after 10 PM.',
    'Check-in is anytime after 3 PM.',
    'Check-out by 11 AM.',
  ],
  experiences: [
    {
      title: 'Private Yacht Tour',
      description: 'Explore the coastline on a luxury private yacht.',
      link: '#',
    },
    {
      title: 'In-Villa Chef Service',
      description: 'Enjoy a gourmet meal prepared by a professional chef in the comfort of the villa.',
      link: '#',
    },
    {
      title: 'Surfing Lessons',
      description: 'Catch some waves with a private surfing instructor.',
      link: '#',
    },
  ],
  faqs: [
    {
      question: 'What is the WiFi password?',
      answer: 'The WiFi network is "VillaGuest" and the password is "oceanbreeze2024".',
    },
    {
      question: 'How do I operate the smart TV?',
      answer: 'Use the main remote to turn on the TV. You can find Netflix, Hulu, and other apps in the main menu. Enjoy!',
    },
    {
      question: 'Is the pool heated?',
      answer: 'Yes, the pool is heated to a comfortable 82°F (28°C) year-round.',
    },
  ],
};
