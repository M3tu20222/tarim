'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerPage = () => {
  return <SwaggerUI url="/api/doc/swagger" />;
};

export default SwaggerPage;
