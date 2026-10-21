import { useLocation } from './lib/router';
import { Board } from './pages/Board';
import { Login } from './pages/Login';
import { Projects } from './pages/Projects';
import { Empty, Toasts } from './components/ui';

export function App() {
  const loc = useLocation();
  const path = loc.split('?')[0];
  const board = /^\/p\/([0-9a-f-]{36})\/?$/i.exec(path);

  let page;
  if (path === '/login') page = <Login />;
  else if (path === '/') page = <Projects />;
  else if (board) page = <Board key={board[1]} id={board[1]} />;
  else
    page = (
      <div className="wrap">
        <Empty>
          Not found. <a href="/">Back to projects</a>
        </Empty>
      </div>
    );

  return (
    <>
      {page}
      <Toasts />
    </>
  );
}
