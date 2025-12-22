import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Statistic, Button } from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  TrophyOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { fetchDecks } from '../store/decksSlice';
import { AppDispatch, RootState } from '../store';

function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const { decks } = useSelector((state: RootState) => state.decks);

  useEffect(() => {
    dispatch(fetchDecks());
  }, [dispatch]);

  return (
    <div>
      <h1>Welcome to Flashcard Chiikawa!</h1>
      <p style={{ fontSize: '16px', marginTop: '16px', marginBottom: '32px' }}>
        Your German learning companion with spaced repetition
      </p>

      <Row gutter={16} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Decks"
              value={decks.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cards Due Today"
              value={0}
              prefix={<ReadOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cards Reviewed"
              value={0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Quick Actions">
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/review" style={{ flex: 1 }}>
            <Button type="primary" size="large" block icon={<ReadOutlined />}>
              Start Review Session
            </Button>
          </Link>
          <Link to="/decks" style={{ flex: 1 }}>
            <Button size="large" block icon={<PlusOutlined />}>
              Create New Deck
            </Button>
          </Link>
          <Link to="/editor" style={{ flex: 1 }}>
            <Button size="large" block icon={<PlusOutlined />}>
              Add New Card
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default Home;
