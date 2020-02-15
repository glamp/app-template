import React from 'react';


export default () => (
  <div style={{
    backgroundImage: 'url(https://images.unsplash.com/photo-1526241118614-728ce3418077?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1650&q=80)',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    height: '100vh',
  }}>
    <div style={{
      padding: 100,
      backgroundColor: 'white',
      maxWidth: 300,
      position: 'fixed',
      top: 150,
    }}>
      <h1>The page you're looking for doesn't exist.</h1>
      <hr />
      <h2>Vaya con Dios</h2>
    </div>
  </div>
)
