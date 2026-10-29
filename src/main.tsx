import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home, Collections, CollectionPage, ArtworkPage, InformationPage, NotFound } from './pages/Pages';
import { informationPages } from './data';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="collections" element={<Collections/>}/><Route path="collections/:slug" element={<CollectionPage/>}/><Route path="collections/:slug/:artworkSlug" element={<ArtworkPage/>}/>{(Object.keys(informationPages) as (keyof typeof informationPages)[]).map(page => <Route key={page} path={page} element={<InformationPage page={page}/>}/>)}<Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter></React.StrictMode>);
