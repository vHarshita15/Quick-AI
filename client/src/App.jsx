import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import WriteArticle from './pages/WriteArticle';
import BlogTitles from './pages/BlogTitles';
import Community from './pages/Community';
import GenerateImage from './pages/GenerateImage';
import RemoveBackground from './pages/RemoveBackground';
import RemoveObjects from './pages/RemoveObjects';
import ReviewResume from './pages/ReviewResume';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <div>
      <Toaster />
      <Routes>
        <Route path='/' element={<Home />} />

        <Route path='/ai' element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path='write-article' element={<WriteArticle />} />
          <Route path='blog-titles' element={<BlogTitles />} />
          <Route path='community' element={<Community />} />
          <Route path='generate-images' element={<GenerateImage />} />
          <Route path='remove-background' element={<RemoveBackground />} />
          <Route path='remove-objects' element={<RemoveObjects />} />
          <Route path='review-resume' element={<ReviewResume />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;