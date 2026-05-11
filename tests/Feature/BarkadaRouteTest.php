<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('redirects guests to login', function () {
    $this->withoutVite();

    $this->get('/barkada')->assertRedirect('/login');
});

it('returns the correct view prop for each route', function (string $url, string $view) {
    $this->withoutVite();

    $this->actingAs(User::factory()->create())
        ->get($url)
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('barkada')
                ->where('view', $view),
        );
})->with([
    'home' => ['/barkada', 'home'],
    'members' => ['/barkada/members', 'members'],
    'budget' => ['/barkada/budget', 'budget'],
    'expenses' => ['/barkada/expenses', 'expenses'],
    'settlement' => ['/barkada/settlement', 'settlement'],
    'categories' => ['/barkada/categories', 'categories'],
    'carpools' => ['/barkada/carpools', 'carpools'],
]);

it('has named routes for all views', function () {
    expect(route('barkada'))->toEndWith('/barkada');
    expect(route('barkada.members'))->toEndWith('/barkada/members');
    expect(route('barkada.budget'))->toEndWith('/barkada/budget');
    expect(route('barkada.expenses'))->toEndWith('/barkada/expenses');
    expect(route('barkada.settlement'))->toEndWith('/barkada/settlement');
    expect(route('barkada.categories'))->toEndWith('/barkada/categories');
    expect(route('barkada.carpools'))->toEndWith('/barkada/carpools');
});
