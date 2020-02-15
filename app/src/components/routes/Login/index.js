import React from 'react';
import { Row, Col } from 'react-flexbox-grid';
import { Heading, Button } from 'evergreen-ui';
import Seperator from '../../shared/Seperator';

export default () => (
  <Row center="xs" style={{ height: '100vh', backgroundColor: 'white', }}>
    <Col xs={12} md={5}>
      <div style={{
        backgroundColor: 'white',
        paddingTop: 200,
        width: '100%',
      }}>
        <center>
          <Heading size={600}>Welcome to Waldo</Heading>
          <Seperator marginTop={25} marginBottom={25} />
          <Button
            onClick={() => window.location.pathname = '/auth/google'}
          >
            Sign in with Google
          </Button>
        </center>
      </div>
    </Col>
    <Col md={7}>
      <div style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1489035300997-93cd03b5a885?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1650&q=80)',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        height: '100%',
        width: '100%',
      }} />
    </Col>
  </Row>
)
