export interface SampleMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  title: string;
  description: string;
}

export const SAMPLES: SampleMedia[] = [
  {
    id: 'sample-1',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    type: 'image',
    title: 'Cinematic Landscape',
    description: 'Perfect for testing filter extraction with vibrant colors and deep shadows.'
  },
  {
    id: 'sample-2',
    url: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80',
    type: 'image',
    title: 'Urban Street',
    description: 'Great for testing watermark removal on complex backgrounds.'
  },
  {
    id: 'sample-3',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    type: 'image',
    title: 'Portrait',
    description: 'Ideal for analyzing skin tones and subtle lighting filters.'
  },
  {
    id: 'sample-4',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    type: 'image',
    title: 'Nature Mist',
    description: 'Test how AI handles soft gradients and atmospheric effects.'
  }
];
