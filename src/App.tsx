import { Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  BarChartOutlined,
  EditOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import Home from './pages/Home';
import DeckList from './pages/DeckList';
import DeckDetail from './pages/DeckDetail';
import CardEditor from './pages/CardEditor';
import ReviewSession from './pages/ReviewSession';
import Statistics from './pages/Statistics';

const { Header, Content, Sider } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
          }}
        >
          Flashcard Chiikawa
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['home']}
          style={{ height: '100%', borderRight: 0 }}
        >
          <Menu.Item key="home" icon={<HomeOutlined />}>
            <Link to="/">Home</Link>
          </Menu.Item>
          <Menu.Item key="decks" icon={<BookOutlined />}>
            <Link to="/decks">Decks</Link>
          </Menu.Item>
          <Menu.Item key="review" icon={<ReadOutlined />}>
            <Link to="/review">Review</Link>
          </Menu.Item>
          <Menu.Item key="editor" icon={<EditOutlined />}>
            <Link to="/editor">Card Editor</Link>
          </Menu.Item>
          <Menu.Item key="stats" icon={<BarChartOutlined />}>
            <Link to="/stats">Statistics</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 280,
            background: '#fff',
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/decks" element={<DeckList />} />
            <Route path="/decks/:deckId" element={<DeckDetail />} />
            <Route path="/review" element={<ReviewSession />} />
            <Route path="/editor" element={<CardEditor />} />
            <Route path="/editor/:cardId" element={<CardEditor />} />
            <Route path="/stats" element={<Statistics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
