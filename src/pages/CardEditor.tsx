import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Select, Button, message, Space, Tag, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { createCard, updateCard, fetchAllCards } from '../store/cardsSlice';
import { fetchDecks } from '../store/decksSlice';
import { AppDispatch, RootState } from '../store';
import { NewCard, Tag as TagType } from '../types/card';

function CardEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const [searchParams] = useSearchParams();
  const deckIdParam = searchParams.get('deckId');

  const { decks } = useSelector((state: RootState) => state.decks);
  const { cards } = useSelector((state: RootState) => state.cards);
  const [form] = Form.useForm();
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState('');

  const existingCard = cardId ? cards.find((c) => c.id === Number(cardId)) : null;
  const isEditing = !!cardId;

  useEffect(() => {
    dispatch(fetchDecks());
    if (isEditing) {
      dispatch(fetchAllCards());
    }
    loadTags();
  }, [dispatch, isEditing]);

  const loadTags = async () => {
    try {
      const allTags = await window.electronAPI.tags.getAll();
      setTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleCreateTag = async (tagName: string) => {
    try {
      const newTag = await window.electronAPI.tags.create({
        name: tagName,
        color: '#1890ff',
      });
      setTags([...tags, newTag]);
      setSelectedTags([...selectedTags, newTag.id]);
      message.success(`Tag "${tagName}" created!`);
    } catch (error) {
      message.error('Failed to create tag');
      console.error('Failed to create tag:', error);
    }
  };

  useEffect(() => {
    if (existingCard) {
      form.setFieldsValue({
        deck_id: existingCard.deck_id,
        front: existingCard.front,
        back: existingCard.back,
        context: existingCard.context || '',
        notes: existingCard.notes || '',
      });
      loadCardTags(existingCard.id);
    } else if (deckIdParam) {
      form.setFieldsValue({ deck_id: Number(deckIdParam) });
    }
  }, [existingCard, deckIdParam, form]);

  const loadCardTags = async (cardId: number) => {
    try {
      const cardTags = await window.electronAPI.tags.getForCard(cardId);
      setSelectedTags(cardTags.map((t) => t.id));
    } catch (error) {
      console.error('Failed to load card tags:', error);
    }
  };

  const handleSubmit = async (values: NewCard) => {
    try {
      let savedCardId: number;

      if (isEditing && cardId) {
        await dispatch(updateCard({ id: Number(cardId), card: values })).unwrap();
        savedCardId = Number(cardId);

        // Update tags - remove all existing tags and add new ones
        // Note: In a real app, we'd want to be smarter about this
        await saveTags(savedCardId);

        message.success('Card updated successfully!');
        navigate(-1);
      } else {
        const newCard = await dispatch(createCard(values)).unwrap();
        savedCardId = newCard.id;

        // Add tags to the new card
        await saveTags(savedCardId);

        message.success('Card created successfully!');
        form.resetFields();
        setSelectedTags([]);
        if (deckIdParam) {
          form.setFieldsValue({ deck_id: Number(deckIdParam) });
        }
      }
    } catch (error) {
      message.error(isEditing ? 'Failed to update card' : 'Failed to create card');
    }
  };

  const saveTags = async (cardId: number) => {
    try {
      if (isEditing) {
        // When editing, get current tags and remove ones not in selectedTags
        const currentTags = await window.electronAPI.tags.getForCard(cardId);
        const currentTagIds = currentTags.map((t) => t.id);

        // Remove tags that are no longer selected
        for (const tagId of currentTagIds) {
          if (!selectedTags.includes(tagId)) {
            await window.electronAPI.tags.removeFromCard(cardId, tagId);
          }
        }

        // Add new tags
        for (const tagId of selectedTags) {
          if (!currentTagIds.includes(tagId)) {
            await window.electronAPI.tags.addToCard(cardId, tagId);
          }
        }
      } else {
        // When creating, just add all selected tags
        for (const tagId of selectedTags) {
          await window.electronAPI.tags.addToCard(cardId, tagId);
        }
      }
    } catch (error) {
      console.error('Failed to save tags:', error);
    }
  };

  const insertGermanChar = (char: string) => {
    const field = form.getFieldValue('front') || '';
    form.setFieldsValue({ front: field + char });
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isEditing && (
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
        )}
        <h1 style={{ margin: 0 }}>{isEditing ? 'Edit Card' : 'Create New Card'}</h1>
      </div>
      <Card style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Deck"
            name="deck_id"
            rules={[{ required: true, message: 'Please select a deck' }]}
          >
            <Select placeholder="Select a deck">
              {decks.map((deck) => (
                <Select.Option key={deck.id} value={deck.id}>
                  {deck.icon} {deck.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Front (German)"
            name="front"
            rules={[{ required: true, message: 'Please enter the front text' }]}
          >
            <Input.TextArea rows={2} placeholder="German word or phrase" />
          </Form.Item>

          <div className="german-char-helper">
            <span>German characters:</span>
            {['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map((char) => (
              <Button
                key={char}
                size="small"
                className="german-char-btn"
                onClick={() => insertGermanChar(char)}
              >
                {char}
              </Button>
            ))}
          </div>

          <Form.Item
            label="Back (Translation)"
            name="back"
            rules={[{ required: true, message: 'Please enter the back text' }]}
            style={{ marginTop: '16px' }}
          >
            <Input.TextArea rows={2} placeholder="English translation" />
          </Form.Item>

          <Form.Item label="Context (Example Sentence)" name="context">
            <Input.TextArea rows={2} placeholder="Example sentence in German" />
          </Form.Item>

          <Form.Item label="Notes (Grammar, Gender, etc.)" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="e.g., der/die/das, plural form, verb conjugation"
            />
          </Form.Item>

          <Form.Item label="Tags">
            <Select
              mode="multiple"
              placeholder="Select or create tags"
              value={selectedTags}
              onChange={setSelectedTags}
              onSearch={setTagSearchValue}
              style={{ width: '100%' }}
              optionFilterProp="children"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {tagSearchValue && !tags.some((t) => t.name.toLowerCase() === tagSearchValue.toLowerCase()) && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          handleCreateTag(tagSearchValue);
                          setTagSearchValue('');
                        }}
                        style={{ width: '100%', textAlign: 'left' }}
                      >
                        Create tag "{tagSearchValue}"
                      </Button>
                    </>
                  )}
                </>
              )}
            >
              {tags.map((tag) => (
                <Select.Option key={tag.id} value={tag.id}>
                  <Tag color={tag.color || 'blue'}>{tag.name}</Tag>
                </Select.Option>
              ))}
            </Select>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Type to search or create new tags. Common: noun, verb, adjective, A1, A2, B1, B2
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {isEditing ? 'Update Card' : 'Create Card'}
              </Button>
              {isEditing ? (
                <Button onClick={() => navigate(-1)}>Cancel</Button>
              ) : (
                <Button onClick={() => form.resetFields()}>Reset</Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default CardEditor;
