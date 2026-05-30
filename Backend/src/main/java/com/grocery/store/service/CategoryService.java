package com.grocery.store.service;

import com.grocery.store.entity.Category;
import com.grocery.store.exception.DuplicateResourceException;
import com.grocery.store.exception.ResourceNotFoundException;
import com.grocery.store.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @CacheEvict(value = "categories", allEntries = true)
    public Category createCategory(String name, String description) {
        if (categoryRepository.existsByName(name)) {
            throw new DuplicateResourceException("Category already exists");
        }

        Category category = Category.builder()
                .name(name)
                .description(description)
                .build();

        return categoryRepository.save(category);
    }

    @Cacheable("categories")
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
    }
}
