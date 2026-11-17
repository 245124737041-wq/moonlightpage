import React, { useState } from 'react';
import { Book } from '../types.ts';

interface BookCoverProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({ book, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-24 rounded-md',
    md: 'w-full aspect-[3/4] rounded-lg',
    lg: 'w-44 sm:w-48 aspect-[3/4] rounded-lg',
  }[size];

  const showImage = book.coverImage && !imgError;

  if (showImage) {
    return (
      <div
        className={`relative overflow-hidden bg-stone-100 dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/70 shadow-sm ${sizeClasses} ${className}`}
      >
        <img
          src={book.coverImage!}
          alt={`${book.title} by ${book.author}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: book.coverPalette.bg, color: book.coverPalette.text }}
      className={`relative overflow-hidden border border-black/10 dark:border-white/10 shadow-sm flex flex-col justify-between p-3.5 select-none ${sizeClasses} ${className}`}
    >
      {/* Subtle linen spine line */}
      <div
        className="absolute inset-y-0 left-2 w-px opacity-25"
        style={{ backgroundColor: book.coverPalette.accent }}
      />
      {/* Delicate corner rule */}
      <div
        className="border-t pt-2 pl-2 flex-1 flex flex-col justify-between"
        style={{ borderColor: `${book.coverPalette.accent}44` }}
      >
        <div>
          {size !== 'sm' && (
            <p
              className="text-[10px] tracking-[0.16em] uppercase opacity-75 truncate"
              style={{ color: book.coverPalette.accent }}
            >
              {book.genres[0]}
            </p>
          )}
          <h4
            className={`font-display font-medium leading-tight mt-1 ${
              size === 'sm'
                ? 'text-[10px] line-clamp-3'
                : size === 'lg'
                ? 'text-lg line-clamp-3'
                : 'text-base line-clamp-3'
            }`}
          >
            {book.title}
          </h4>
        </div>

        <div className="pt-2">
          {size !== 'sm' && (
            <div
              className="w-6 h-px mb-1.5 opacity-60"
              style={{ backgroundColor: book.coverPalette.accent }}
            />
          )}
          <p
            className={`${
              size === 'sm' ? 'text-[9px]' : 'text-xs'
            } opacity-85 truncate font-sans`}
          >
            {book.author}
          </p>
        </div>
      </div>
    </div>
  );
};
