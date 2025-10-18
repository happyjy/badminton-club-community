import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const clubId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: {
          clubOperatingTime: true,
          clubLocation: true,
          clubDescription: true,
        },
      });

      res.status(200).json(settings || {});
    } catch (error) {
      console.error('Error fetching club home settings:', error);
      res.status(500).json({ error: 'Failed to fetch club home settings' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { clubOperatingTime, clubLocation, clubDescription } = req.body;

      const settings = await prisma.clubCustomSettings.upsert({
        where: { clubId },
        update: {
          clubOperatingTime,
          clubLocation,
          clubDescription,
        },
        create: {
          clubId,
          clubOperatingTime,
          clubLocation,
          clubDescription,
        },
      });

      res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating club home settings:', error);
      res.status(500).json({ error: 'Failed to update club home settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
