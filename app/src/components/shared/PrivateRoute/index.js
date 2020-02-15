import React, { Component } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { Row, Col } from 'react-flexbox-grid';
import _ from 'lodash';
import axios from 'axios';


export default class PrivateRoute extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: null,
      isAdmin: false,
    };
  }

  isLoggedIn(done) {
    axios.get('/users/me?ts=' + (+new Date()))
      .then(response => {
        const user = response.data;
        if (window.waldo && user) {
          waldo.identify(user.email);
          if (window.location.search.indexOf('survey=1') > -1) {
            waldo.showSurvey();
          }
        }

        done(response.status < 400, response.status===403, response.data.isAdmin);
      })
      .catch(err => {
        console.error(`[ERROR]: issue validating user is logged in : ${err}`);
        done(false, err.response.status===403);
      })
  }

  componentDidMount() {
    this.isLoggedIn((ok, isBanned, isAdmin) => {
      this.setState({
        isLoggedIn: ok===true,
        isAdmin,
      });
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.path!==this.props.path) {
      this.isLoggedIn((ok, isBanned, isImpersonation, email) => {
        this.setState({
          isLoggedIn: ok===true,
          isBanned,
        });
      });
    }
  }

  render() {
    const props = this.props;
    if (this.state.isLoggedIn===null) {
      return null; // should be a blank background
    }

    if (this.state.isBanned) {
      return <Redirect to={{ pathname: '/app/banned', state: { from: this.props.location } }}/>;
    }

    // if the user isn't logged in, then bounce them
    if (this.state.isLoggedIn===false) {
      return <Redirect to={{ pathname: '/app/login', state: { from: this.props.location } }}/>;
    }

    // if it's an admin route, make sure the user can do this
    if (props.admin===true && this.state.isAdmin===false) {
      return <Redirect to={{ pathname: '/app/login', state: { from: this.props.location } }}/>;
    }

    return <Route {...props} />;
  }
}
