import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/table-agent.component/table-agent.component').then(
        m => m.TableAgentComponent
      ),
    pathMatch: 'full'
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./components/add-agent.component/add-agent.component').then(
        m => m.AddEmployeeComponent
      )
  },
  {
    path: 'delete',
    loadComponent: () =>
      import('./components/delete-agent.component/delete-agent.component').then(
        m => m.DeleteEmployeeComponent
      )
  }
];