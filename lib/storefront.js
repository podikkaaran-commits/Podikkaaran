import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getProducts as readProducts, getSettings as readSettings } from './db';

export const getProducts = cache(unstable_cache(readProducts, ['public-catalogue'], {
  tags: ['public-catalogue'], revalidate: 30,
}));
export const getSettings = cache(unstable_cache(readSettings, ['public-settings'], {
  tags: ['public-settings'], revalidate: 30,
}));
export const getProduct = async slug => (await getProducts()).find(product => product.slug === slug);
