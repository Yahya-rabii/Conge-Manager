import { Routes } from '@angular/router';
import { SearchAgentComponent } from './components/search-agent.component/search-agent.component';
import { AddEmployeeComponent } from './components/add-agent.component/add-agent.component';
import { DeleteEmployeeComponent } from './components/delete-agent.component/delete-agent.component';
import { TableAgentComponent } from './components/table-agent.component/table-agent.component';

export const routes: Routes = [
  { path: '', component: TableAgentComponent, pathMatch: 'full' },  { path: 'search', component: SearchAgentComponent },
  { path: 'add', component: AddEmployeeComponent },
  { path: 'delete', component: DeleteEmployeeComponent },
];