'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Image from 'next/image';
import CreatableSelect from 'react-select/creatable';
import { ArrowLeft } from "lucide-react"

export default function EditPrompt({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [prompt, setPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/prompts/${id}`)
        .then((response) => response.json())
        .then((data) => setPrompt(data))
        .catch((error) => console.error('Error fetching prompt:', error));
    }

    fetch('/api/tags')
      .then((response) => response.json())
      .then((data) => {
        setTagOptions(data.map(tag => ({ value: tag.name, label: tag.name })));
      })
      .catch((error) => console.error('Error fetching tags:', error));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 防止在图片上传过程中提交
    if (isUploading) {
      alert('请等待图片上传完成');
      return;
    }
    
    setIsSubmitting(true);

    try {
      console.log('Updating prompt data:', prompt);
      console.log('Cover image URL:', prompt.cover_img);
      
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (response.ok) {
        console.log('Prompt updated successfully');
        router.push(`/prompts/${id}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update prompt');
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
      alert('更新失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!prompt) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-6 max-w-4xl">
      <div className="flex items-center gap-2 sm:gap-4 mb-6">
        <Button
          variant="ghost"
          className="text-muted-foreground h-8 sm:h-10 p-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg sm:text-2xl font-bold flex-grow">编辑提示词</h1>
      </div>

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
                value={prompt.tags?.split(',').map(tag => ({ value: tag, label: tag }))||[]}
                onChange={(selected) => {
                  const tags = selected ? selected.map(option => option.value).join(',') : '';
                  setPrompt({ ...prompt, tags });
                }}
                options={tagOptions}
                className="basic-multi-select"
                classNamePrefix="select"
                isCreatable={true}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onCreateOption={async (inputValue) => {
                  try {
                    const response = await fetch('/api/tags', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ name: inputValue }),
                    });
                    
                    if (response.ok) {
                      const newOption = { value: inputValue, label: inputValue };
                      setTagOptions([...tagOptions, newOption]);
                      
                      const newTags = prompt.tags ? `${prompt.tags},${inputValue}` : inputValue;
                      setPrompt({ ...prompt, tags: newTags });
                    }
                  } catch (error) {
                    console.error('Error creating new tag:', error);
                  }
                }}
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
                  <Image src={prompt.cover_img} alt="封面预览" className="w-20 h-20 object-cover rounded" width={80} height={80}/>
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
                {isSubmitting ? '保存中...' : isUploading ? '等待上传...' : '保存'}
              </Button>
              <Button
                type="button"
                variant="outline"
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
