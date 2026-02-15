import React from 'react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import MainLayout from './shared/ui/Layout/MainLayout';
import Dashboard from './features/dashboard/Dashboard';

function App() {
  return (
    <Provider store={store}>
      <MainLayout>
        <Dashboard />
      </MainLayout>
    </Provider>
  );
}

export default App;