'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Image from 'next/image';

export default function NewPrompt() {
  const [prompt, setPrompt] = useState({
    title: '',
    content: '',
    description: '',
    tags: '',
    version: '',
    cover_img: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/tags')
      .then((response) => response.json())
      .then((data) => {
        setTagOptions(data.map(tag => ({ value: tag.name, label: tag.name })));
      })
      .catch((error) => console.error('Error fetching tags:', error));
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      try {
        console.log('Starting image upload...');
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.url) {
          // 使用函数式更新确保状态正确
          setPrompt(prevPrompt => ({ ...prevPrompt, cover_img: data.url }));
          console.log('Image uploaded successfully:', data.url);
        } else {
          throw new Error('No URL returned from upload');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('图片上传失败: ' + error.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 防止在图片上传过程中提交
    if (isUploading) {
      alert('请等待图片上传完成');
      return;
    }
    
    setIsSubmitting(true);

    try {
      console.log('Submitting prompt data:', prompt);
      console.log('Cover image URL:', prompt.cover_img);
      
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create prompt');
      }

      console.log('Prompt created successfully:', data);
      router.push('/prompts');
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('创建失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tagSelectProps = {
    isCreatable: true,
    onKeyDown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Get the input value
        const inputValue = e.target.value;
        if (inputValue) {
          // Call onCreateOption with the current input value
          tagSelectProps.onCreateOption(inputValue);
        }
      }
    },
    onCreateOption: async (inputValue) => {
      try {
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: inputValue }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const newOption = { value: inputValue, label: inputValue };
          setTagOptions(prev => [...prev, newOption]);
          
          const newTags = prompt.tags ? `${prompt.tags},${inputValue}` : inputValue;
          setPrompt({ ...prompt, tags: newTags });
        } else {
          console.error('Error creating tag:', data.error);
          alert('创建标签失败: ' + data.error);
        }
      } catch (error) {
        console.error('Error creating new tag:', error);
        alert('创建标签失败: ' + error.message);
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">创建新提示词</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={prompt.title}
                onChange={(e) => setPrompt({ ...prompt, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                value={prompt.content}
                onChange={(e) => setPrompt({ ...prompt, content: e.target.value })}
                className="min-h-[128px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={prompt.description}
                onChange={(e) => setPrompt({ ...prompt, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <CreatableSelect
                id="tags"
                isMulti
                value={prompt.tags?prompt.tags.split(',').map(tag => ({ value: tag, label: tag })):[]}
                onChange={(selected) => {
                  const tags = selected ? selected.map(option => option.value).join(',') : '';
                  setPrompt({ ...prompt, tags });
                }}
                options={tagOptions}
                className="basic-multi-select"
                classNamePrefix="select"
                {...tagSelectProps}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                value={prompt.version}
                onChange={(e) => setPrompt({ ...prompt, version: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover_img">封面图片</Label>
              <div className="flex items-center gap-4">
                {prompt.cover_img && (
                  <Image src={prompt.cover_img} alt="封面预览" className="w-20 h-20 object-cover rounded" width={80} height={80} />
                )}
                <Input
                  id="cover_img"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading && (
                  <span className="text-sm text-muted-foreground">上传中...</span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? '创建中...' : isUploading ? '等待上传...' : '创建'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 
