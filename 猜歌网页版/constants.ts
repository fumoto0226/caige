import { Artist, Song } from './types';

export const ARTISTS: Artist[] = [
  { id: '1', name: '周杰伦', avatar: 'https://picsum.photos/seed/jay/100/100' },
  { id: '2', name: '陈奕迅', avatar: 'https://picsum.photos/seed/eason/100/100' },
  { id: '3', name: '邓紫棋', avatar: 'https://picsum.photos/seed/gem/100/100' },
  { id: '4', name: '林俊杰', avatar: 'https://picsum.photos/seed/jj/100/100' },
];

export const SONGS: Song[] = [
  { id: '101', title: '晴天', artistId: '1', cover: 'https://picsum.photos/seed/s1/200/200' },
  { id: '102', title: '夜曲', artistId: '1', cover: 'https://picsum.photos/seed/s2/200/200' },
  { id: '103', title: '稻香', artistId: '1', cover: 'https://picsum.photos/seed/s3/200/200' },
  { id: '201', title: '十年', artistId: '2', cover: 'https://picsum.photos/seed/s4/200/200' },
  { id: '202', title: '红玫瑰', artistId: '2', cover: 'https://picsum.photos/seed/s5/200/200' },
  { id: '203', title: '单车', artistId: '2', cover: 'https://picsum.photos/seed/s6/200/200' },
  { id: '301', title: '泡沫', artistId: '3', cover: 'https://picsum.photos/seed/s7/200/200' },
  { id: '302', title: '光年之外', artistId: '3', cover: 'https://picsum.photos/seed/s8/200/200' },
  { id: '401', title: '不为谁而作的歌', artistId: '4', cover: 'https://picsum.photos/seed/s9/200/200' },
  { id: '402', title: '小酒窝', artistId: '4', cover: 'https://picsum.photos/seed/s10/200/200' },
];