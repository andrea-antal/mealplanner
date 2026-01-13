"""
Tests for shopping list and template models.

TDD: These tests are written first, before implementation.
"""
import pytest
from datetime import date, datetime
from pydantic import ValidationError


class TestShoppingListItem:
    """Tests for ShoppingListItem model"""

    def test_create_minimal_item(self):
        """Should create item with just name"""
        from app.models.shopping import ShoppingListItem

        item = ShoppingListItem(name="milk")

        assert item.name == "milk"
        assert item.id is not None  # Auto-generated UUID
        assert item.is_checked is False
        assert item.quantity is None
        assert item.category is None
        assert item.template_id is None

    def test_create_full_item(self):
        """Should create item with all fields"""
        from app.models.shopping import ShoppingListItem

        item = ShoppingListItem(
            name="eggs",
            canonical_name="eggs",
            quantity="1 dozen",
            category="dairy",
            is_checked=True,
            template_id="template-123",
        )

        assert item.name == "eggs"
        assert item.canonical_name == "eggs"
        assert item.quantity == "1 dozen"
        assert item.category == "dairy"
        assert item.is_checked is True
        assert item.template_id == "template-123"

    def test_added_at_defaults_to_now(self):
        """Should auto-set added_at to current timestamp"""
        from app.models.shopping import ShoppingListItem

        before = datetime.now()
        item = ShoppingListItem(name="milk")
        after = datetime.now()

        assert before <= item.added_at <= after

    def test_id_is_unique(self):
        """Each item should get a unique ID"""
        from app.models.shopping import ShoppingListItem

        item1 = ShoppingListItem(name="milk")
        item2 = ShoppingListItem(name="milk")

        assert item1.id != item2.id

    def test_name_required(self):
        """Should fail without name"""
        from app.models.shopping import ShoppingListItem

        with pytest.raises(ValidationError):
            ShoppingListItem()


class TestTemplateItem:
    """Tests for TemplateItem model"""

    def test_create_minimal_template(self):
        """Should create template with name and category"""
        from app.models.shopping import TemplateItem

        template = TemplateItem(name="milk", category="dairy")

        assert template.name == "milk"
        assert template.category == "dairy"
        assert template.id is not None
        assert template.is_favorite is False
        assert template.frequency is None
        assert template.default_quantity is None
        assert template.last_purchased is None

    def test_create_full_template(self):
        """Should create template with all fields"""
        from app.models.shopping import TemplateItem

        template = TemplateItem(
            name="eggs",
            canonical_name="eggs",
            category="dairy",
            default_quantity="1 dozen",
            frequency="weekly",
            is_favorite=True,
            last_purchased=date(2024, 1, 15),
        )

        assert template.name == "eggs"
        assert template.canonical_name == "eggs"
        assert template.category == "dairy"
        assert template.default_quantity == "1 dozen"
        assert template.frequency == "weekly"
        assert template.is_favorite is True
        assert template.last_purchased == date(2024, 1, 15)

    def test_valid_frequencies(self):
        """Should accept valid frequency values"""
        from app.models.shopping import TemplateItem

        for freq in ["weekly", "biweekly", "monthly", "as_needed"]:
            template = TemplateItem(name="test", category="pantry", frequency=freq)
            assert template.frequency == freq

    def test_invalid_frequency_rejected(self):
        """Should reject invalid frequency values"""
        from app.models.shopping import TemplateItem

        with pytest.raises(ValidationError):
            TemplateItem(name="test", category="pantry", frequency="daily")

    def test_category_required(self):
        """Should fail without category"""
        from app.models.shopping import TemplateItem

        with pytest.raises(ValidationError):
            TemplateItem(name="milk")

    def test_name_required(self):
        """Should fail without name"""
        from app.models.shopping import TemplateItem

        with pytest.raises(ValidationError):
            TemplateItem(category="dairy")

    def test_created_at_defaults_to_now(self):
        """Should auto-set created_at to current timestamp"""
        from app.models.shopping import TemplateItem

        before = datetime.now()
        template = TemplateItem(name="milk", category="dairy")
        after = datetime.now()

        assert before <= template.created_at <= after


class TestShoppingList:
    """Tests for ShoppingList container model"""

    def test_create_empty_list(self):
        """Should create empty shopping list"""
        from app.models.shopping import ShoppingList

        shopping_list = ShoppingList()

        assert shopping_list.items == []

    def test_create_list_with_items(self):
        """Should create list with items"""
        from app.models.shopping import ShoppingList, ShoppingListItem

        items = [
            ShoppingListItem(name="milk"),
            ShoppingListItem(name="eggs"),
        ]
        shopping_list = ShoppingList(items=items)

        assert len(shopping_list.items) == 2
        assert shopping_list.items[0].name == "milk"
        assert shopping_list.items[1].name == "eggs"


class TestTemplateList:
    """Tests for TemplateList container model"""

    def test_create_empty_list(self):
        """Should create empty template list"""
        from app.models.shopping import TemplateList

        template_list = TemplateList()

        assert template_list.items == []

    def test_create_list_with_templates(self):
        """Should create list with templates"""
        from app.models.shopping import TemplateList, TemplateItem

        templates = [
            TemplateItem(name="milk", category="dairy"),
            TemplateItem(name="bread", category="bakery"),
        ]
        template_list = TemplateList(items=templates)

        assert len(template_list.items) == 2
        assert template_list.items[0].name == "milk"
        assert template_list.items[1].name == "bread"


class TestShoppingListItemFromTemplate:
    """Tests for creating shopping items from templates"""

    def test_create_from_template(self):
        """Should create shopping item from template"""
        from app.models.shopping import ShoppingListItem, TemplateItem

        template = TemplateItem(
            name="milk",
            canonical_name="milk",
            category="dairy",
            default_quantity="1 gallon",
            is_favorite=True,
        )

        item = ShoppingListItem.from_template(template)

        assert item.name == "milk"
        assert item.canonical_name == "milk"
        assert item.category == "dairy"
        assert item.quantity == "1 gallon"
        assert item.template_id == template.id
        assert item.is_checked is False

    def test_override_quantity_from_template(self):
        """Should allow overriding quantity when creating from template"""
        from app.models.shopping import ShoppingListItem, TemplateItem

        template = TemplateItem(
            name="milk",
            category="dairy",
            default_quantity="1 gallon",
        )

        item = ShoppingListItem.from_template(template, quantity="2 gallons")

        assert item.quantity == "2 gallons"
