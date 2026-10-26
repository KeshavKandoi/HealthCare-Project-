import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import './index.css'
import App from './App'
import store from './redux/store';
import { LanguageProvider } from './i18n/LanguageContext';

const root = document.getElementById('root');
if (!root) throw new Error('Application root element missing');
createRoot(root).render(

   <Provider store={store}>

<BrowserRouter>
      <LanguageProvider><App /></LanguageProvider>
   </BrowserRouter>

   </Provider>


)
