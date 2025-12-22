import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, Row, Col, Statistic, Empty, Select, Spin } from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FireOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { RootState } from '../store';
import { OverallStatistics, ReviewHistoryEntry, DeckSummary } from '../types/statistics';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

function Statistics() {
  const { decks } = useSelector((state: RootState) => state.decks);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStatistics | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);
  const [deckStats, setDeckStats] = useState<Record<number, DeckSummary>>({});
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    loadStatistics();
  }, [selectedDays]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Load overall statistics
      const overall = await window.electronAPI.stats.getOverall();
      setOverallStats(overall);

      // Load review history for charts
      const history = await window.electronAPI.stats.getReviewHistory(selectedDays);
      setReviewHistory(history);

      // Load deck statistics
      const deckStatsMap: Record<number, DeckSummary> = {};
      for (const deck of decks) {
        const summary = await window.electronAPI.stats.getDeckSummary(deck.id);
        deckStatsMap[deck.id] = summary;
      }
      setDeckStats(deckStatsMap);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!overallStats) {
    return <div>Failed to load statistics</div>;
  }

  // Calculate success rate
  const successRate =
    overallStats.totalReviews > 0
      ? Math.round(
          (reviewHistory.reduce((sum, day) => sum + day.correct, 0) /
            reviewHistory.reduce((sum, day) => sum + day.count, 0)) *
            100
        ) || 0
      : 0;

  // Prepare data for deck performance bar chart
  const deckPerformanceData = decks.map((deck) => ({
    name: deck.name,
    reviews: deckStats[deck.id]?.totalReviews || 0,
    time: Math.round((deckStats[deck.id]?.totalTimeSpent || 0) / 60000), // Convert to minutes
    mastered: deckStats[deck.id]?.masteredCards || 0,
  }));

  // Prepare data for review history line chart
  const reviewHistoryData = reviewHistory.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cards: day.count,
    correct: day.correct,
    accuracy: day.count > 0 ? Math.round((day.correct / day.count) * 100) : 0,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Statistics & Progress</h1>
        <Select
          value={selectedDays}
          onChange={setSelectedDays}
          style={{ width: 150 }}
          options={[
            { value: 7, label: 'Last 7 days' },
            { value: 30, label: 'Last 30 days' },
            { value: 90, label: 'Last 90 days' },
            { value: 365, label: 'Last year' },
          ]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Cards"
              value={overallStats.totalCards}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Reviews"
              value={overallStats.totalReviews}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Time Spent"
              value={Math.round(overallStats.totalTimeSpent / 60000)}
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Success Rate"
              value={successRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: successRate >= 75 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Current Streak"
              value={overallStats.currentStreak}
              suffix="days"
              prefix={<FireOutlined />}
              valueStyle={{ color: overallStats.currentStreak >= 7 ? '#f5222d' : '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Due Today"
              value={overallStats.dueToday}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Reviewed Today"
              value={overallStats.reviewedToday}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {reviewHistory.length > 0 ? (
        <>
          <Card title="Review History" style={{ marginTop: '24px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reviewHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cards"
                  stroke="#1890ff"
                  name="Cards Reviewed"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="correct"
                  stroke="#52c41a"
                  name="Correct"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Accuracy Over Time" style={{ marginTop: '24px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reviewHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#faad14"
                  name="Accuracy %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {deckPerformanceData.some((d) => d.reviews > 0) && (
            <Card title="Deck Performance" style={{ marginTop: '24px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deckPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reviews" fill="#1890ff" name="Reviews" />
                  <Bar dataKey="mastered" fill="#52c41a" name="Mastered Cards" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      ) : (
        <Card title="Review History" style={{ marginTop: '24px' }}>
          <Empty
            description="No review data yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <p>Start reviewing cards to see your progress here!</p>
          </Empty>
        </Card>
      )}
    </div>
  );
}

export default Statistics;
