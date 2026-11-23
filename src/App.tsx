import { lazy, Suspense } from 'react';
import { StudioListing, StudioProduct } from './studio/StudioStore';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home, Collections, CollectionPage, ArtworkPage, InformationPage, NotFound } from './pages/Pages';
import { informationPages } from './data';
import './styles.css';
import './gallery-typography.css';
import { ForestCollection } from './forest/ForestCollection';
import { Analytics } from './analytics/Analytics';
import { RouteMetadata } from './seo/RouteMetadata';
import { CertificatePage } from './coa/CertificatePage';
const StudioTemplatePreview = import.meta.env.DEV ? lazy(() => import('./studio/StudioTemplatePreview')) : null;
function LegacyContactRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname:'/about', search, hash }} replace/>;
}
export function App() { return <><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="coa/forest-and-flowers/:artworkSlug/:designation" element={<CertificatePage/>}/><Route path="studio-editions" element={<StudioListing/>}/><Route path="studio-editions/:productSlug" element={<StudioProduct/>}/>{StudioTemplatePreview && <Route path="dev/studio-template" element={<Suspense fallback={<p>Loading presentation study…</p>}><StudioTemplatePreview/></Suspense>}/> }<Route path="collections" element={<Collections/>}/><Route path="collections/forest-and-flowers" element={<ForestCollection/>}/><Route path="collections/forest-and-flowers/:artworkSlug" element={<ForestCollection/>}/><Route path="collections/:slug" element={<CollectionPage/>}/><Route path="collections/:slug/:artworkSlug" element={<ArtworkPage/>}/>{(Object.keys(informationPages) as (keyof typeof informationPages)[]).map(page => <Route key={page} path={page} element={<InformationPage page={page}/>}/>)}<Route path="contact" element={<LegacyContactRedirect/>}/><Route path="*" element={<NotFound/>}/></Route></Routes><RouteMetadata/><Analytics/></>; }
