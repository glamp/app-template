import React from 'react';
import ReactDOM from 'react-dom';
import 'babel-polyfill';
import './globalutils';
import App from './App';

// website styles
import './index.scss';

ReactDOM.render(<App />, document.getElementById('root'));

// Hot Module Replacement
if (module.hot) {
  module.hot.accept();
}
