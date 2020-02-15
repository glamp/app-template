import React from 'react';
import {
  BrowserRouter as Router,
  Redirect,
  Switch,
  Route,
  Link
} from 'react-router-dom';

import PrivateRoute from './components/shared/PrivateRoute';
import Login from './components/routes/Login';
import NotFound from './components/routes/NotFound';

export default () => (
  <Router>
    <div>
      <Switch>
        <Route exact path="/app/login">
          <Login />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </div>
  </Router>
);
